# Локальное хранение, медиа и ZIP-бэкап для bare React Native

**Дата проверки:** 2026-09-16  
**Issue:** [#16](https://github.com/bndby/discount-cards/issues/16)  
**Контекст:** bare React Native без Expo runtime и без Expo-модулей. Базовые библиотеки — [#10](https://github.com/bndby/discount-cards/issues/10); контракт сущности и ZIP v1 — [#15](https://github.com/bndby/discount-cards/issues/15). Предыдущая Expo-резолюция #16 не применяется.

Версии npm на дату проверки: `@op-engineering/op-sqlite` 18.2.3, `react-native-blob-util` 0.25.0, `react-native-fs` 2.20.0, `react-native-zip-archive` 9.5.1, `react-native-share` 12.3.1, `@react-native-documents/picker` 12.0.2, `react-native-image-picker` 8.2.1.

## Решение

| Задача | Пакет | Зачем |
| --- | --- | --- |
| Записи карточек | [`@op-engineering/op-sqlite`](https://github.com/OP-Engineering/op-sqlite) | SQLite на iOS и Android; `transaction` / `executeBatch` для replace-all импорта; одна сессия — одно соединение. |
| Байты фото | [`react-native-blob-util`](https://github.com/RonRadtke/react-native-blob-util) | Копирование во `fs.dirs.DocumentDir` (не cache); `cp` / `unlink` / `hash(..., 'sha256')`; заявлена New Architecture. |
| ZIP v1 | [`react-native-zip-archive`](https://github.com/mockingbot/react-native-zip-archive) v9 | Нативный zip/unzip на iOS и Android; `listContents`; отказ `ERR_UNSAFE_PATH`. |
| Share экспорта | [`react-native-share`](https://github.com/react-native-share/react-native-share) `Share.open` | Системный share sheet файла `file://…`. Встроенный RN `Share` файлы не отдаёт. |
| Выбор ZIP импорта | [`@react-native-documents/picker`](https://react-native-documents.github.io/) `pick` + `keepLocalCopy` | Системный document picker; URI выбора временный. |
| Камера / галерея | [`react-native-image-picker`](https://github.com/react-native-image-picker/react-native-image-picker) (уже #10) | После pick сразу копировать в DocumentDir: URI кэша не персистентен. |

Источник истины карточек — SQL-таблицы OP-SQLite, не KV. Фото — файлы в песочнице, в БД только относительный путь и SHA-256. Бэкап — ZIP v1 из #15, не бинарник SQLite и не JSON PWA.

## 1. Записи карточек

### Рекомендация: OP-SQLite, SQL, не KV

[`@op-engineering/op-sqlite`](https://github.com/OP-Engineering/op-sqlite) заявлен для iOS, Android, macOS и web ([README](https://github.com/OP-Engineering/op-sqlite); [установка](https://op-engineering.github.io/op-sqlite/docs/installation)). Expo Go не поддерживается; для bare RN достаточно `npm i` и `pod install`. Пакет — Turbo Module (`codegenConfig.type: "modules"` в [package.json](https://github.com/OP-Engineering/op-sqlite/blob/main/package.json)); пример собирается с React Native 0.87.

Открывать **одно** соединение на сессию ([API](https://op-engineering.github.io/op-sqlite/docs/api)):

```ts
import { open } from '@op-engineering/op-sqlite'
export const db = open({ name: 'discount-cards.sqlite' })
```

Путь по умолчанию: [Library на iOS](https://op-engineering.github.io/op-sqlite/docs/configuration), [каталог databases на Android](https://op-engineering.github.io/op-sqlite/docs/configuration). Это не пользовательский Documents; медиа туда не класть. Экспорт пути: `db.getDbPath()`.

Транзакции для replace-all ([API — Transactions](https://op-engineering.github.io/op-sqlite/docs/api)): ошибка внутри колбэка делает ROLLBACK; есть ручные `tx.commit()` / `tx.rollback()`. Для пачки INSERT — `executeBatch`: весь вызов обёрнут в транзакцию, при ошибке откатывается целиком. Документация рекомендует транзакции даже для чтения: «even read calls can corrupt a sqlite database».

Встроенный [Key-Value Storage](https://op-engineering.github.io/op-sqlite/docs/key_value_storage) — удобство «как AsyncStorage», не реляционная модель и не транзакционная замена набора карточек. Для карточек не использовать.

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
- `cp` / `mv` / `unlink` / `mkdir` / `exists`;
- `hash(path, 'sha256')` — для манифеста #15.

После `launchImageLibrary` / `launchCamera` сразу `cp` во `${DocumentDir}/media/<id>.<ext>`. В SQLite хранить относительный путь. Удаление карточки — `unlink` файлов.

Кэш-файлы `fileCache` **не** удаляются сами; для фото карточек `fileCache` не использовать.

### Сравнение с `react-native-fs`

[`react-native-fs`](https://github.com/itinance/react-native-fs): `DocumentDirectoryPath` на обеих платформах, `CachesDirectoryPath`, `TemporaryDirectoryPath` (на Android = cache), `copyFile`, `unlink`, `hash(..., 'sha256')`. На iOS `copyFile` **не** перезаписывает существующий файл. `mkdir` умеет `NSURLIsExcludedFromBackupKey` (iOS). README по-прежнему описывает RN < 0.57 / 0.61 и **не** декларирует New Architecture.

`react-native-zip-archive` в примерах берёт `DocumentDirectoryPath` из RNFS; библиотеке нужен абсолютный путь, не сам RNFS. Два FS-модуля не нужны.

### Document vs cache vs tmp

Apple ([File System Programming Guide](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html)):

- `Documents/` — пользовательские данные, бэкапятся iTunes/iCloud;
- `Library/` (кроме `Caches`) — служебные файлы, бэкапятся;
- `Library/Caches/` — система может удалить при нехватке места; не бэкапится;
- `tmp/` — система может очистить, пока приложение не запущено; не бэкапится.

Фото карточек класть в `DocumentDir` (или в подкаталог Library с исключением из backup), **не** в cache/tmp.

Android Auto Backup **не** включает cache ([Test backup](https://developer.android.com/identity/data/testingbackup)); файлы в app-specific storage и БД попадают в квоту 25 MB ([Auto Backup](https://developer.android.com/identity/data/autobackup)).

## 3. ZIP v1

[`react-native-zip-archive`](https://github.com/mockingbot/react-native-zip-archive) v9: RN ≥ 0.70, iOS ≥ 15.5, Android API ≥ 23; New Architecture (Turbo Module). Для bare RN: `npm install` + `pod install`. Expo Go не поддерживается (для этого репозитория нерелевантно).

Нужные вызовы:

- `zip(sourceDirOrFiles, targetZip)` — папка staging с `manifest.json` + медиа → `discount-cards-backup-v1-YYYY-MM-DD.zip`;
- `unzip(sourceZip, targetDir)` — распаковка выбранного файла;
- `listContents` — проверка записей до unzip;
- `ERR_UNSAFE_PATH` — Zip Slip.

Пароль в v1 не нужен (#15); `zipWithPassword` не вызывать. JSZip в README библиотеки помечен как memory-heavy; для нативного zip/unzip на устройстве выбран этот пакет.

Поток экспорта: снимок строк в транзакции → копия медиа в уникальный staging (cache) → `zip(staging, targetInCache)` → `Share.open` локального zip → удалить staging.

Поток импорта: picker → `keepLocalCopy` в cache → `listContents` / `unzip` в staging → валидация манифеста и SHA-256 → копия медиа в DocumentDir → SQL replace-all → удаление старых файлов после коммита.

## 4. Share и выбор файла

### Экспорт: `react-native-share`, не RN `Share`

Встроенный [`Share.share`](https://reactnative.dev/docs/share) принимает `message` / `url` (URL как ссылка) / `title`. Это текст, не произвольный файл из песочницы.

[`Share.open`](https://react-native-share.github.io/react-native-share/docs/share-open) шарит текст и **файлы**. Локальный файл: `url: "file://<path>"`. Для ZIP не гонять base64 (раздувает память); при base64 на API 30+ нужен `useInternalStorage: true`. [Установка bare RN](https://react-native-share.github.io/react-native-share/docs/install): `yarn add` + `pod install`; для шаринга из app-specific cache `WRITE_EXTERNAL_STORAGE` не нужен. На Android 11+ `<queries>` нужны только если целиться в конкретные пакеты через `shareSingle`, не для системного sheet. Свой FileProvider — опциональная секция установки.

### Импорт: `@react-native-documents/picker`

Наследник `react-native-document-picker` ([миграция](https://react-native-documents.github.io/docs/sponsor-only/migration)). Bare RN: пакет + `pod install`; заявлены последние 3 стабильные версии RN, ориентир 0.76+ ([install](https://react-native-documents.github.io/docs/install)).

Режим import ([import mode](https://react-native-documents.github.io/docs/sponsor-only/picker/import-mode)): на iOS файл временный («officially until the application terminates but practically much shorter»); на Android `content://` может указывать в облако. Обязательно [`keepLocalCopy`](https://react-native-documents.github.io/docs/sponsor-only/picker/keeping-local-copy) с `destination: 'cachesDirectory'` (временный ZIP) или копирование через blob-util. Для постоянного хранения медиа — `documentDirectory`, но ZIP после распаковки в cache не оставлять.

Тип: `pick({ type: [types.zip] })` ([типы](https://react-native-documents.github.io/docs/sponsor-only/picker/limiting-selectable-files)). На части Android Document Provider игнорирует `type` — проверять `hasRequestedType`.

`keepLocalCopy` на iOS работает в import mode; каждый вызов создаёт уникальный подкаталог (нет перезаписи одноимённых файлов).

## 5. Разрешения

Только то, что требует этот стек (камера/галерея уже в image-picker).

| Источник | iOS | Android |
| --- | --- | --- |
| [image-picker](https://github.com/react-native-image-picker/react-native-image-picker#post-install-steps) галерея | `NSPhotoLibraryUsageDescription` | Разрешения не требуются (Photo Picker). При `minSdk < 30` — `androidx.activity:activity:1.9.+` для backport picker. |
| image-picker камера | `NSCameraUsageDescription` | `CAMERA` в манифесте ⇒ запросить runtime **до** `launchCamera`. Библиотека сама CAMERA не требует. |
| image-picker `saveToPhotos` | — | `WRITE_EXTERNAL_STORAGE` на API ≤ 28. Для карточек не нужно: копируем в sandbox, не в публичные Photos. |
| blob-util / OP-SQLite / zip-archive | нет runtime-разрешений на sandbox | нет, пока пишем в app-specific dirs, не в общую внешнюю память |
| document picker | системный UIDocumentPicker | SAF / GET_CONTENT; отдельного storage permission нет |
| react-native-share файл из sandbox | нет | нет `WRITE_EXTERNAL_STORAGE` для app-specific cache ([install](https://react-native-share.github.io/react-native-share/docs/install)) |

Микрофон (`NSMicrophoneUsageDescription` / RECORD_AUDIO) для фото не нужен.

## 6. Ловушки

1. **Два SQLite.** OP-SQLite предупреждает о clash с `expo-sqlite`, `expo-updates`, cozodb и любым пакетом, который линкует sqlite3. На bare-стеке без Expo не ставить второй SQLite. `iosSqlite: true` — обходной путь только если конфликт неизбежен (старая встроенная SQLite, без расширений).
2. **Временные URI image-picker.** `uri` — app-specific cache; камера пишет во временную папку, файл могут удалить. «don't expect it to persist» ([Note on file storage](https://github.com/react-native-image-picker/react-native-image-picker#note-on-file-storage)). Видео из Android gallery может быть read-only `content://` — копировать в sandbox. Не сохранять picker URI в SQLite.
3. **Android Photo Picker.** Галерея без storage permission; backport через AndroidX Activity, если minSdk < 30 ([README image-picker](https://github.com/react-native-image-picker/react-native-image-picker) → [Android Photo Picker](https://developer.android.com/training/data-storage/shared/photopicker)).
4. **iOS Documents vs tmp vs Caches.** Documents/Library переживают перезапуск; Caches и tmp — нет. Импорт ZIP: сначала cache/staging, постоянные фото — DocumentDir. iOS может удалить файл document picker «довольно скоро» без `keepLocalCopy`.
5. **Нет атомарности БД+файлы.** SQLite атомарно коммитит **только файл БД** ([Atomic Commit](https://www.sqlite.org/atomiccommit.html)). ФС в ту же транзакцию не входит. Порядок: провалидировать staging → скопировать медиа под новыми именами (ещё не в рабочих строках) → `db.transaction` / `executeBatch` replace-all → после коммита удалить старые медиа. Наоборот (сначала удалить файлы) даёт битые ссылки при краше. После коммита возможны сироты — сборщик при старте.
6. **Android Auto Backup 25 MB.** Auto Backup заливает данные приложения в Drive, до 25 MB на приложение; сверх квоты бэкап не делается (`onQuotaExceeded`) ([Auto Backup](https://developer.android.com/identity/data/autobackup)). Пользователь файл не получает. Медиа легко превысят лимит. Не считать это экспортом #15. Исключить БД и каталог медиа из backup rules; на iOS пометить медиа `NSURLIsExcludedFromBackupKey` (есть в RNFS `mkdir`; в blob-util отдельного ключа в wiki нет — native `NSURLIsExcludedFromBackupKey` или каталог вне Documents).
7. **SHA-256.** Считать нативным `hash(..., 'sha256')` (blob-util / RNFS), не в JS по base64 всего файла. Алгоритм — [FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final).
8. **Одно соединение OP-SQLite.** Повторный `open` той же БД — запрещённый паттерн. При reload (`react-native-restart`) вызвать `db.close()` ([gotchas](https://op-engineering.github.io/op-sqlite/docs/gotchas)).
9. **zip-archive сериализует операции** (один executor / serial queue). Не параллелить zip и unzip.
10. **iOS `copyFile` в RNFS** падает, если dest существует; blob-util `cp` это не оговаривает так же — проверять `unlink` перед копией при replace.

## Явно отвергнуто

- **Любые Expo-модули** (`expo-sqlite`, `expo-file-system`, `expo-image-picker`, `expo-sharing`, `expo-document-picker` и остальные): канон — bare RN без Expo runtime (#16 переоткрыт; #10).
- **MMKV (и OP-SQLite Storage) как источник истины карточек:** нет транзакционной замены набора записей и миграций схемы. KV — только мелочи UI.
- **Бинарный файл SQLite как бэкап:** не переносит файлы медиа, жёстко вяжет формат к реализации БД ([ADR 0001](../adr/0001-own-zip-backup.md), #15).
- **JSON-бэкап PWA:** отвергнут в #15; фото в нём нет, совместимость не обещана.
- **Фото в SQLite BLOB:** поддерживается API, не подходит как хранилище 0–2 снимков «как есть».
- **Системный iCloud / Android Auto Backup вместо пользовательского ZIP:** непрозрачно, квота 25 MB, нет файла `discount-cards-backup-v1-…zip`.

## Источники

- [#16](https://github.com/bndby/discount-cards/issues/16), [#15](https://github.com/bndby/discount-cards/issues/15), [#10](https://github.com/bndby/discount-cards/issues/10)
- [OP-SQLite README](https://github.com/OP-Engineering/op-sqlite), [установка / конфликты sqlite](https://op-engineering.github.io/op-sqlite/docs/installation), [API транзакций](https://op-engineering.github.io/op-sqlite/docs/api), [пути БД](https://op-engineering.github.io/op-sqlite/docs/configuration), [KV Storage](https://op-engineering.github.io/op-sqlite/docs/key_value_storage), [gotchas](https://op-engineering.github.io/op-sqlite/docs/gotchas)
- [react-native-mmkv](https://github.com/margelo/react-native-mmkv)
- [react-native-blob-util README](https://github.com/RonRadtke/react-native-blob-util/blob/master/README.md), [FS wiki](https://github.com/RonRadtke/react-native-blob-util/wiki/File-System-Access-API)
- [react-native-fs README](https://github.com/itinance/react-native-fs/blob/master/README.md)
- [react-native-zip-archive README](https://github.com/mockingbot/react-native-zip-archive/blob/master/README.md)
- [react-native-share Share.open](https://react-native-share.github.io/react-native-share/docs/share-open), [установка](https://react-native-share.github.io/react-native-share/docs/install)
- [RN Share](https://reactnative.dev/docs/share)
- [Document picker install](https://react-native-documents.github.io/docs/install), [import mode](https://react-native-documents.github.io/docs/sponsor-only/picker/import-mode), [keepLocalCopy](https://react-native-documents.github.io/docs/sponsor-only/picker/keeping-local-copy), [types.zip](https://react-native-documents.github.io/docs/sponsor-only/picker/limiting-selectable-files)
- [react-native-image-picker](https://github.com/react-native-image-picker/react-native-image-picker/blob/master/README.md)
- [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html)
- [Android Auto Backup](https://developer.android.com/identity/data/autobackup)
- [Apple File System Programming Guide](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html)
- [NIST FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
