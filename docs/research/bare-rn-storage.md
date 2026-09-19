# Локальное хранение и медиа для bare React Native

**Дата проверки:** 2026-09-16  
**Issue:** [Выбрать хранение и медиа для bare React Native](https://github.com/bndby/discount-cards/issues/16)  
**Контекст:** bare React Native без Expo runtime и без Expo-модулей. Базовые библиотеки — [Проверить совместимые React Native-библиотеки MVP](https://github.com/bndby/discount-cards/issues/10); сущность карточки — [Определить мобильную модель скидочной карточки](https://github.com/bndby/discount-cards/issues/15). Предыдущая Expo-резолюция #16 не применяется.

Версии npm на дату проверки: `@op-engineering/op-sqlite` 18.2.3, `react-native-blob-util` 0.25.0, `react-native-fs` 2.20.0, `react-native-image-picker` 8.2.1.

## Решение

| Задача | Пакет | Зачем |
| --- | --- | --- |
| Записи карточек | [`@op-engineering/op-sqlite`](https://github.com/OP-Engineering/op-sqlite) | SQLite на iOS и Android; `transaction` / `executeBatch`; одна сессия — одно соединение. |
| Байты фото | [`react-native-blob-util`](https://github.com/RonRadtke/react-native-blob-util) | Копирование во `fs.dirs.DocumentDir` (не cache); `cp` / `unlink`; заявлена New Architecture. |
| Камера / галерея | [`react-native-image-picker`](https://github.com/react-native-image-picker/react-native-image-picker) (уже в тикете библиотек) | После pick сразу копировать в DocumentDir: URI кэша не персистентен. |

Источник истины карточек — SQL-таблицы OP-SQLite, не KV. Фото — файлы в песочнице, в БД только относительный путь.

## 1. Записи карточек

### Рекомендация: OP-SQLite, SQL, не KV

[`@op-engineering/op-sqlite`](https://github.com/OP-Engineering/op-sqlite) заявлен для iOS, Android, macOS и web ([README](https://github.com/OP-Engineering/op-sqlite); [установка](https://op-engineering.github.io/op-sqlite/docs/installation)). Expo Go не поддерживается; для bare RN достаточно `npm i` и `pod install`. Пакет — Turbo Module (`codegenConfig.type: "modules"` в [package.json](https://github.com/OP-Engineering/op-sqlite/blob/main/package.json)); пример собирается с React Native 0.87.

Открывать **одно** соединение на сессию ([API](https://op-engineering.github.io/op-sqlite/docs/api)):

```ts
import { open } from '@op-engineering/op-sqlite'
export const db = open({ name: 'discount-cards.sqlite' })
```

Путь по умолчанию: [Library на iOS](https://op-engineering.github.io/op-sqlite/docs/configuration), [каталог databases на Android](https://op-engineering.github.io/op-sqlite/docs/configuration). Это не пользовательский Documents; медиа туда не класть. Путь файла БД: `db.getDbPath()`.

Транзакции ([API — Transactions](https://op-engineering.github.io/op-sqlite/docs/api)): ошибка внутри колбэка делает ROLLBACK; есть ручные `tx.commit()` / `tx.rollback()`. Для пачки INSERT — `executeBatch`: весь вызов обёрнут в транзакцию, при ошибке откатывается целиком. Документация рекомендует транзакции даже для чтения: «even read calls can corrupt a sqlite database».

Встроенный [Key-Value Storage](https://op-engineering.github.io/op-sqlite/docs/key_value_storage) — удобство «как AsyncStorage», не реляционная модель. Для карточек не использовать.

BLOB в SQLite поддерживается (`ArrayBuffer` / typed array), но для фото карточки это раздувает БД и смешивает байты с записями; байты держать в файлах.

### Альтернативы без Expo

| Вариант | Почему не основной путь |
| --- | --- |
| [`react-native-mmkv`](https://github.com/margelo/react-native-mmkv) | KV: get/set строк, чисел, булевых, `ArrayBuffer`. Нет SQL-транзакции на набор записей. V4 требует RN 0.76+ и Nitro. Допустим только для некритичных UI-настроек. |
| OP-SQLite Storage API | Тот же KV поверх SQLite, «use at your own caution». |
| Другой SQLite-пакет рядом с OP-SQLite | [Конфликт компиляции](https://op-engineering.github.io/op-sqlite/docs/installation): два пакета, линкующие sqlite, дают duplicate symbols / разные флаги. Не добавлять `expo-sqlite` и прочие sqlite-pods. |

## 2. Байты фото

У React Native **нет** first-party API записи файлов в песочницу (список [APIs](https://reactnative.dev/docs/share) — Share, Linking и т.д., без FileSystem). Нужен нативный FS-модуль.

### Рекомендация: `react-native-blob-util`

[README](https://github.com/RonRadtke/react-native-blob-util): iOS и Android; New Architecture с 0.17.0; линейка 0.22.x привязана к RN 0.76+. [Wiki FS](https://github.com/RonRadtke/react-native-blob-util/wiki/File-System-Access-API):

- `fs.dirs.DocumentDir` — постоянный каталог приложения;
- `fs.dirs.CacheDir` — кэш;
- `cp` / `mv` / `unlink` / `mkdir` / `exists`.

После `launchImageLibrary` / `launchCamera` сразу `cp` во `${DocumentDir}/media/<id>.<ext>`. В SQLite хранить относительный путь. Удаление карточки — `unlink` файлов.

Кэш-файлы `fileCache` **не** удаляются сами; для фото карточек `fileCache` не использовать.

### Сравнение с `react-native-fs`

[`react-native-fs`](https://github.com/itinance/react-native-fs): `DocumentDirectoryPath` на обеих платформах, `CachesDirectoryPath`, `TemporaryDirectoryPath` (на Android = cache), `copyFile`, `unlink`. На iOS `copyFile` **не** перезаписывает существующий файл. README по-прежнему описывает RN < 0.57 / 0.61 и **не** декларирует New Architecture. Два FS-модуля не нужны.

### Document vs cache vs tmp

Apple ([File System Programming Guide](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html)):

- `Documents/` и `Library/` (кроме `Caches`) сохраняются между запусками;
- `Library/Caches/` — система может удалить при нехватке места;
- `tmp/` — система может очистить, пока приложение не запущено.

Фото карточек класть в `DocumentDir`, **не** в cache/tmp.

## 3. Разрешения

Только то, что требует этот стек (камера/галерея уже в image-picker).

| Источник | iOS | Android |
| --- | --- | --- |
| [image-picker](https://github.com/react-native-image-picker/react-native-image-picker#post-install-steps) галерея | `NSPhotoLibraryUsageDescription` | Разрешения не требуются (Photo Picker). При `minSdk < 30` — `androidx.activity:activity:1.9.+` для backport picker. |
| image-picker камера | `NSCameraUsageDescription` | `CAMERA` в манифесте ⇒ запросить runtime **до** `launchCamera`. Библиотека сама CAMERA не требует. |
| image-picker `saveToPhotos` | — | `WRITE_EXTERNAL_STORAGE` на API ≤ 28. Для карточек не нужно: копируем в sandbox, не в публичные Photos. |
| blob-util / OP-SQLite | нет runtime-разрешений на sandbox | нет, пока пишем в app-specific dirs, не в общую внешнюю память |

Микрофон (`NSMicrophoneUsageDescription` / RECORD_AUDIO) для фото не нужен.

## 4. Ловушки

1. **Два SQLite.** OP-SQLite предупреждает о clash с `expo-sqlite`, `expo-updates`, cozodb и любым пакетом, который линкует sqlite3. На bare-стеке без Expo не ставить второй SQLite. `iosSqlite: true` — обходной путь только если конфликт неизбежен (старая встроенная SQLite, без расширений).
2. **Временные URI image-picker.** `uri` — app-specific cache; камера пишет во временную папку, файл могут удалить. «don't expect it to persist» ([Note on file storage](https://github.com/react-native-image-picker/react-native-image-picker#note-on-file-storage)). Видео из Android gallery может быть read-only `content://` — копировать в sandbox. Не сохранять picker URI в SQLite.
3. **Android Photo Picker.** Галерея без storage permission; backport через AndroidX Activity, если minSdk < 30 ([README image-picker](https://github.com/react-native-image-picker/react-native-image-picker) → [Android Photo Picker](https://developer.android.com/training/data-storage/shared/photopicker)).
4. **iOS Documents vs tmp vs Caches.** Documents/Library переживают перезапуск; Caches и tmp — нет. Постоянные фото — DocumentDir.
5. **Нет атомарности БД+файлы.** SQLite атомарно коммитит **только файл БД** ([Atomic Commit](https://www.sqlite.org/atomiccommit.html)). ФС в ту же транзакцию не входит. Порядок при замене фото: скопировать новые файлы под новыми именами → обновить строки → после коммита удалить старые медиа. Наоборот (сначала удалить файлы) даёт битые ссылки при краше. После коммита возможны сироты — сборщик при старте.
6. **Одно соединение OP-SQLite.** Повторный `open` той же БД — запрещённый паттерн. При reload (`react-native-restart`) вызвать `db.close()` ([gotchas](https://op-engineering.github.io/op-sqlite/docs/gotchas)).
7. **iOS `copyFile` в RNFS** падает, если dest существует; blob-util `cp` это не оговаривает так же — проверять `unlink` перед копией при замене.

## Явно отвергнуто

- **Любые Expo-модули** (`expo-sqlite`, `expo-file-system`, `expo-image-picker` и остальные): канон — bare RN без Expo runtime.
- **MMKV (и OP-SQLite Storage) как источник истины карточек:** нет транзакционной замены набора записей и миграций схемы. KV — только мелочи UI.
- **Фото в SQLite BLOB:** поддерживается API, не подходит как хранилище 0–2 снимков «как есть».

## Источники

- [Выбрать хранение и медиа для bare React Native](https://github.com/bndby/discount-cards/issues/16), [Определить мобильную модель скидочной карточки](https://github.com/bndby/discount-cards/issues/15), [Проверить совместимые React Native-библиотеки MVP](https://github.com/bndby/discount-cards/issues/10)
- [OP-SQLite README](https://github.com/OP-Engineering/op-sqlite), [установка / конфликты sqlite](https://op-engineering.github.io/op-sqlite/docs/installation), [API транзакций](https://op-engineering.github.io/op-sqlite/docs/api), [пути БД](https://op-engineering.github.io/op-sqlite/docs/configuration), [KV Storage](https://op-engineering.github.io/op-sqlite/docs/key_value_storage), [gotchas](https://op-engineering.github.io/op-sqlite/docs/gotchas)
- [react-native-mmkv](https://github.com/margelo/react-native-mmkv)
- [react-native-blob-util README](https://github.com/RonRadtke/react-native-blob-util/blob/master/README.md), [FS wiki](https://github.com/RonRadtke/react-native-blob-util/wiki/File-System-Access-API)
- [react-native-fs README](https://github.com/itinance/react-native-fs/blob/master/README.md)
- [react-native-image-picker](https://github.com/react-native-image-picker/react-native-image-picker/blob/master/README.md)
- [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html)
- [Apple File System Programming Guide](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html)
