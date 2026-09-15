# React Native: локальные данные и медиа (iOS/Android)

Исследование для [#3](https://github.com/bndby/discount-cards/issues/3). Карты OSM (тайлы/POI/routing) детально — соседний тикет [#2](https://github.com/bndby/discount-cards/issues/2); здесь только варианты map-библиотек без блокировки на #2.

**Контекст продукта:** данные только на устройстве; фото с камеры/галереи; сканер штрихкодов+QR с ручным вводом; геолокация только в активном приложении; стек уже зафиксирован: React Native, TypeScript, React Navigation, i18next, react-native-paper, Jest.

---

## 1. Базовый подход: Expo Modules + prebuild (не Expo Go)

Фиксированный продукт-стек не запрещает Expo. Для permissions, FS, локации и picker’ов удобнее **Expo project с Continuous Native Generation (`prebuild`) / Dev Client**, а не «чистый» bare без Expo Modules и не Expo Go.

- В bare RN Expo Modules ставятся через `npx install-expo-modules@latest`, далее `npx expo install …` ([Installing Expo modules](https://docs.expo.dev/bare/installing-expo-modules/)).
- Нативные библиотеки вроде VisionCamera, MMKV (Nitro), MapLibre **не работают в Expo Go** — нужен custom native binary (`expo run:*` / EAS Build).
- React Navigation официально предлагает Expo-шаблон и `npx expo install react-native-screens react-native-safe-area-context` ([Getting started](https://reactnavigation.org/docs/getting-started/)).
- react-native-paper с v5 требует `react-native-safe-area-context`; на Expo иконки уже есть через `@expo/vector-icons`, в bare — отдельно Material Design Icons ([Getting started — Paper](https://oss.callstack.com/react-native-paper/docs/guides/getting-started)).

**Целевые версии RN (ориентиры по зависимостям):**

| Библиотека | Требование из первоисточника |
| --- | --- |
| `react-native-mmkv` V4 | RN ≥ 0.76, Nitro Modules ([README](https://github.com/mrousavy/react-native-mmkv/blob/main/README.md)) |
| `@maplibre/maplibre-react-native` v11+ | RN ≥ 0.80 (ниже «might work»), **только New Architecture** ([Getting Started](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)) |
| React Navigation 7 | RN ≥ 0.72 ([Getting started](https://reactnavigation.org/docs/getting-started/)) |

**MVP-ориентир:** RN **0.80+**, New Architecture **включена**, Expo SDK, совместимый с этим RN.

---

## 2. Локальное хранилище

### Кандидаты

| Решение | Тип | Плюсы | Минусы | Источник |
| --- | --- | --- | --- | --- |
| **react-native-mmkv** | sync KV (C++/Nitro) | Быстро (~30× AsyncStorage), sync API, encryption, hooks, Jest mock из коробки | Не SQL; объекты → JSON; V4 → Nitro + RN 0.76+ | [MMKV README](https://github.com/mrousavy/react-native-mmkv/blob/main/README.md) |
| **expo-sqlite** | SQLite | Запросы/индексы, TypeScript API, Expo-first | Нужен Expo Modules; async API; схема/миграции | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| **@op-engineering/op-sqlite** | SQLite (JSI) | Высокая производительность | Конфликты с другими SQLite pods; сложнее setup | [OP-SQLite docs](https://op-engineering.github.io/op-sqlite/docs/installation) |
| **@react-native-async-storage/async-storage** | async KV | Простота, широко известен | Медленнее MMKV; async-only; хуже для частых чтений списка | Сравнение в [MMKV README](https://github.com/mrousavy/react-native-mmkv/blob/main/README.md) |

### Минимальный setup (MMKV)

```sh
npx expo install react-native-mmkv react-native-nitro-modules
npx expo prebuild
```

```ts
import { createMMKV } from 'react-native-mmkv'

export const storage = createMMKV() // один инстанс на приложение
```

- Опционально `encryptionKey` / `encrypt()` для чувствительных полей ([README](https://github.com/mrousavy/react-native-mmkv/blob/main/README.md)).
- Jest: mock MMKV подставляется автоматически ([Testing with Jest](https://github.com/mrousavy/react-native-mmkv/blob/main/README.md#testing-with-jest-or-vitest)).
- Ограничение: remote Chrome debugging недоступен из‑за JSI — Flipper / React DevTools ([Limitations](https://github.com/mrousavy/react-native-mmkv/blob/main/README.md#limitations)).

### Рекомендация по модели данных MVP

Для скидочных карт (десятки–сотни записей, сортировка favorites / open-count на клиенте, бренды — встроенный immutable каталог):

1. **Карточки + счётчики открытий + prefs** → `react-native-mmkv` (JSON-массив / keyed objects + `useMMKVObject`).
2. **Библиотека брендов** → статический bundled JSON/asset (не в MMKV).
3. **Пути к фото** → строки в записи карточки; сами файлы — в app sandbox (см. §3).
4. **SQLite отложить**, пока не появятся сложные запросы/полнотекст; при росте — `expo-sqlite` без ломки UI-слоя.

AsyncStorage для нового MVP **не рекомендовать**.

---

## 3. Фото: камера, галерея, локальное хранение

### Галерея / системная камера (one-shot)

Два зрелых варианта:

**A. `expo-image-picker`** (предпочтительно при Expo Modules)

- Config plugin для `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` ([Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)).
- `launchImageLibraryAsync` / `launchCameraAsync`; для изображений часто **не нужен** предварительный media-library permission на iOS (см. docs: «No permissions request is necessary for launching the image library» в актуальных примерах).

**B. `react-native-image-picker`**

- iOS: `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` в Info.plist ([README](https://raw.githubusercontent.com/react-native-image-picker/react-native-image-picker/main/README.md)).
- Android: для library **permissions не требуются**; используется AndroidX Photo Picker (соответствие [Google Play Photo and Video Permissions policy](https://support.google.com/googleplay/android-developer/answer/13986130)).
- Важно: если в манифесте объявлен `CAMERA`, runtime permission нужно запросить **до** `launchCamera` ([README](https://raw.githubusercontent.com/react-native-image-picker/react-native-image-picker/main/README.md)).

### Персистентность файлов (критично)

URI из picker/camera часто **временные** и могут исчезнуть:

> Image/video captured via camera will be stored in temporary folder… don't expect it to persist.  
> — [react-native-image-picker README](https://raw.githubusercontent.com/react-native-image-picker/react-native-image-picker/main/README.md)

**MVP-паттерн:** сразу копировать выбранный файл в каталог приложения (`expo-file-system` document directory / app sandbox) и в карточке хранить только стабильный `file://` путь ([Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)). Не полагаться на `saveToPhotos` (это публичная галерея, не внутреннее хранилище приложения).

### In-app камера для фото карточки

Если уже подключён VisionCamera (§4), фото можно снимать через photo output VisionCamera ([Getting Started](https://visioncamera.margelo.com/docs)) и тем же способом копировать в sandbox. Для MVP достаточно **image-picker camera** + отдельный экран сканера — меньше кода.

---

## 4. Сканер штрихкодов и QR

### Рекомендуемый стек: VisionCamera V5 + barcode package

Первоисточники: [VisionCamera Getting Started](https://visioncamera.margelo.com/docs), [Barcode Scanner](https://visioncamera.margelo.com/docs/barcode-scanner), [Margelo: QR/Barcode V5](https://margelo.com/blog/react-native-qr-barcode-scanner-visioncamera-v5).

```sh
npm i react-native-vision-camera react-native-nitro-modules react-native-nitro-image
npm i react-native-vision-camera-barcode-scanner
```

**Permissions (минимум для сканера фото, без видео/микрофона):**

- iOS: `NSCameraUsageDescription`
- Android: `android.permission.CAMERA`
- Expo `app.json` / Info.plist / AndroidManifest — как в [Getting Started §2](https://visioncamera.margelo.com/docs)
- После изменений — `prebuild` + native rebuild

**API:** `<CodeScanner />` из `react-native-vision-camera-barcode-scanner` (MLKit на iOS и Android — единое поведение, в отличие от V4).

```tsx
import { useIsFocused } from '@react-navigation/native'
import { CodeScanner } from 'react-native-vision-camera-barcode-scanner'

const isFocused = useIsFocused()
// + AppState «foreground» (см. §6)

<CodeScanner
  isActive={isFocused /* && isForeground */}
  barcodeFormats={['qr-code', 'ean-13', 'ean-8', 'code-128', 'code-39', 'upc-a', 'upc-e']}
  onBarcodeScanned={(barcodes) => { /* взять rawValue */ }}
/>
```

Документация явно советует **сужать** `barcodeFormats` вместо `'all-formats'` ради производительности ([Barcode Scanner](https://visioncamera.margelo.com/docs/barcode-scanner)).

**Ручной ввод:** обязательный UI-fallback (поле TextInput на экране добавления) — не библиотека; сканер только ускоряет ввод.

**Альтернатива one-shot:** `react-native-data-scanner` упоминается в docs VisionCamera как вариант «только быстрый нативный скан» ([Barcode Scanner tip](https://visioncamera.margelo.com/docs/barcode-scanner)) — для MVP с живым превью `<CodeScanner />` предпочтительнее.

---

## 5. Карты (опции для RN; провайдер — #2)

| Библиотека | OSM-fit | Setup / риски | Источник |
| --- | --- | --- | --- |
| **`@maplibre/maplibre-react-native`** | Да (свой style/tiles) | Expo или bare guides; v11 → New Arch only; RN ≥ 0.80; demotiles только для dev; production — свой provider (Stadia, MapTiler, …) | [Getting Started](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/) |
| **`react-native-maps`** | Нет (Google/Apple) | Android: Google API key + billing; iOS: Apple Maps из коробки или Google с ключом | [installation.md](https://raw.githubusercontent.com/react-native-maps/react-native-maps/master/docs/installation.md) |

**Политика OSMF для `tile.openstreetmap.org`:** нет SLA; обязательны attribution, идентифицируемый User-Agent, кеш; **запрещены** bulk/prefetch/offline download; для production apps рекомендуется альтернативный OSM-derived provider или self-host ([Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)). MapLibre docs также: production style/tiles — свои или коммерческий provider ([Getting Started](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)).

**Геолокация (для радиуса 5 км, не фон):** `expo-location` + только **When In Use** (`NSLocationWhenInUseUsageDescription`); **не** включать `isIosBackgroundLocationEnabled` / `ACCESS_BACKGROUND_LOCATION` ([Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)) — совпадает с out-of-scope «фоновое отслеживание» в #1.

Точный tile/POI/routing стек — решение #2; map **view** для MVP логично закладывать как MapLibre, если #2 подтвердит OSM-vector/raster provider.

---

## 6. Совместимость с React Navigation и react-native-paper

### Общие зависимости

- Оба стека опираются на `react-native-safe-area-context` и (для Navigation) `react-native-screens` ([RN Getting started](https://reactnavigation.org/docs/getting-started/), [Paper Getting started](https://oss.callstack.com/react-native-paper/docs/guides/getting-started)).
- Типичный корень: `SafeAreaProvider` → `PaperProvider` → `NavigationContainer` (один SafeAreaProvider на дерево; PaperProvider уже содержит совместимый слой — не дублировать конфликтующе).
- Нативные экраны (камера, карта) — обычные React Navigation screens; конфликтов Paper↔VisionCamera/MapLibre на уровне API нет: Paper — JS UI kit, камера/карта — native views.

### Камера ↔ Navigation (подводный камень)

VisionCamera docs используют `useIsFocused()` для `isActive` ([Barcode Scanner example](https://visioncamera.margelo.com/docs/barcode-scanner)). Практика сообщества/issues: комбинировать с **AppState foreground**, иначе камера остаётся активной в фоне или при уходе со стека ([пример обсуждения](https://github.com/mrousavy/react-native-vision-camera/issues/1604)):

```ts
const isActive = isFocused && isForeground
```

### Карта ↔ Navigation / layout

- Контейнеру MapView нужны явные размеры (`flex: 1` / фиксированная высота) — классический pitfall `react-native-maps` ([installation troubleshooting](https://raw.githubusercontent.com/react-native-maps/react-native-maps/master/docs/installation.md)); то же относится к MapLibre `Map`.
- При отсутствии сети/гео: **не монтировать** карту, показать сообщение (продуктовое требование #1) — экономит батарею и избегает пустых тайлов.

### Jest

- MMKV: встроенный mock.
- VisionCamera / MapLibre / FileSystem: нужны ручные mocks в `jest.setup` (native modules).
- UI Paper + Navigation: `@testing-library/react-native` как обычно.

---

## 7. Минимальная матрица permissions (MVP)

| Возможность | iOS (Info.plist) | Android | Когда спрашивать |
| --- | --- | --- | --- |
| Сканер / in-app camera | `NSCameraUsageDescription` | `CAMERA` (+ runtime) | Перед первым открытием сканера / камеры |
| Галерея (Photo Picker / limited) | `NSPhotoLibraryUsageDescription` (формулировка для App Store) | Обычно **без** `READ_MEDIA_IMAGES` при системном picker | По действию «выбрать фото» |
| Локация foreground | `NSLocationWhenInUseUsageDescription` | `ACCESS_FINE_LOCATION` / coarse + runtime | При первом использовании сортировки/карты |
| Микрофон | **не нужен** (нет видео) | не добавлять `RECORD_AUDIO` | — |
| Background location | **не добавлять** | **не добавлять** | out of scope |

Android dangerous permissions — через runtime API ([PermissionsAndroid](https://reactnative.dev/docs/permissionsandroid)); библиотеки камеры/локации дают свои `requestPermission` helpers.

**Не делать:** запрашивать широкий `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` «на всякий случай» — политика Google Play толкает к Photo Picker ([policy](https://support.google.com/googleplay/android-developer/answer/13986130)).

---

## 8. Известные риски и pitfalls

1. **Временные URI фото** → обязательно copy в app documents ([image-picker note](https://raw.githubusercontent.com/react-native-image-picker/react-native-image-picker/main/README.md)).
2. **OSMF tile.openstreetmap.org** не production tile API для приложения ([Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)); ждать/согласовать provider с #2.
3. **Nitro / New Arch** для MMKV V4 и MapLibre v11 — не смешивать со старым bridge-only стеком без плана.
4. **Камера без `isActive` focus+foreground** → индикатор записи/батарея/конфликты с системной камерой.
5. **Expo Go** нельзя использовать как runtime для финального стека (VisionCamera, MMKV Nitro, MapLibre).
6. **Дубли SQLite pods**, если позже смешать `expo-sqlite` и `op-sqlite` ([OP-SQLite](https://op-engineering.github.io/op-sqlite/docs/installation)).
7. **react-native-maps + Google** тянет billing/keys — плохо стыкуется с «OSM maps» без явного решения #2.
8. **i18next**: строки permissions (usage descriptions) лучше локализовать нативно через конфиг плагинов / Info.plist per-locale, не только через JS i18n.

---

## Recommendation

### MVP stack (зафиксировать)

| Область | Выбор |
| --- | --- |
| Проект | **Expo (prebuild / Dev Client)**, RN **0.80+**, **New Architecture on** |
| Данные карточек / prefs | **`react-native-mmkv`** + `react-native-nitro-modules` (JSON); бренды — bundled asset |
| Файлы фото | **`expo-file-system`** → copy в documentDirectory; в MMKV только пути |
| Галерея (+ optional one-shot camera) | **`expo-image-picker`** (config plugin) |
| Сканер barcode/QR | **`react-native-vision-camera`** + **`react-native-vision-camera-barcode-scanner`** + nitro-image; узкий список форматов; **ручной TextInput** обязателен |
| Геолокация | **`expo-location`**, только when-in-use |
| Карта (view) | **`@maplibre/maplibre-react-native`**; style/tiles/POI/routing — по итогам **#2** (не `tile.openstreetmap.org` в проде) |
| UI / nav (уже решено) | react-native-paper + React Navigation + shared safe-area/screens |

### Явно отложить

- SQLite / op-sqlite — до реальной нужды в сложных запросах
- AsyncStorage как primary store
- `react-native-maps` / Google Maps — если #2 подтвердит OSM+MapLibre
- Background location, широкий media read, микрофон
- Отдельная in-app VisionCamera photo UI, пока хватает image-picker

### Минимальный native checklist перед первой сборкой

1. Expo plugins / Info.plist: Camera, Photo Library, Location When In Use (тексты для Store).
2. AndroidManifest: `CAMERA`, location; **без** лишних media/background permissions.
3. `npx expo prebuild` → `expo run:ios` / `run:android` (не Expo Go).
4. На экране сканера: `isActive = useIsFocused() && foreground`.
5. После выбора фото: copy → persist path → сохранить карточку в MMKV.
6. Карту монтировать только при сети+гео; attribution OSM/provider на карте.

Это закрывает вопрос #3: библиотеки, минимальный native/permissions setup, совместимость с Navigation/Paper, MVP-стек и основные ловушки.
)
