# Бесплатные поставщики карт, магазинов и маршрутов

**Дата проверки:** 2026-09-17  
**Issue:** [Определить геосортировку, поиск магазинов и навигацию в мобильном приложении](https://github.com/bndby/discount-cards/issues/19)  
**Запрос:** бесплатный стек, желательно без API-ключа.  
**Предыдущее исследование:** [docs/research/geo-platform.md](https://github.com/bndby/discount-cards/blob/research/geo-platform/docs/research/geo-platform.md) (ветка `research/geo-platform`) — коммерческие OSM-хосты; публичные OSMF/FOSSGIS как production-бэкенд отвергнуты.

Нужны три независимые вещи: **тайлы карты**, **поиск магазина бренда в 5 км**, **пеший и автомобильный маршрут с временем**. Полного production-стека «все три, $0, без ключа, со SLA» нет.

## Что не подходит

| Сервис | Почему нет |
| --- | --- |
| `tile.openstreetmap.org` / FOSSGIS-тайлы | Community tiles: без SLA, приложения без согласия оператора запрещены или могут быть отключены ([Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/), [FOSSGIS ToS](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)) |
| Nominatim `nominatim.openstreetmap.org` | ≤ 1 запрос/с **на всё приложение**; периодические запросы из приложений считаются bulk ([Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)) |
| Публичный Overpass | Явный антипаттерн: приложение не для OSM-мапперов, которое опирается на public instance как backend ([Overpass Commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)) |
| Публичный OSRM / `routing.openstreetmap.de` | Демо без гарантии; FOSSGIS: коммерция только если routing не существенная часть продукта |
| Stadia Maps Free | Коммерция запрещена; для мобильного нужен ключ ([pricing](https://stadiamaps.com/pricing/), [auth](https://docs.stadiamaps.com/authentication/)) |
| MapTiler Cloud Free | «testing, personal or non-commercial»; коммерция — Flex от $30/мес ([pricing](https://www.maptiler.com/cloud/pricing/)) |
| GraphHopper Free | Non-commercial |
| ORS POIs | Максимальный радиус поиска **2 км**, не 5 км ([restrictions](https://openrouteservice.org/restrictions/)) |

Данные OSM по-прежнему свободны по ODbL; ограничены **чужие серверы**.

## Тайлы

### OpenFreeMap — без ключа, коммерция разрешена, без SLA

Публичный инстанс: без регистрации, ключей, лимитов на просмотры; коммерция — «Yes»; сервис as-is, могут выключить без notice ([openfreemap.org](https://openfreemap.org/), [ToS](https://openfreemap.org/tos/)). Стиль для MapLibre: `https://tiles.openfreemap.org/styles/liberty` ([quick start](https://openfreemap.org/quick_start/)); в RN — `mapStyle` у `@maplibre/maplibre-react-native` ([Map docs](https://github.com/maplibre/maplibre-react-native/blob/main/docs/content/components/map.md)). Атрибуция OSM + OpenMapTiles (MapLibre обычно рисует сам).

Это не OSMF tile server: автор явно зовёт сайты и приложения. Надёжность — donation, не контракт.

### Protomaps

Хост API **с ключом**; Free — non-commercial ([protomaps.com/api](https://protomaps.com/api)). Свой `.pmtiles` на своём хостинге или вырезка Беларуси в приложении — без их ключа, но это своя раздача файла (~размер растёт с maxzoom), не «просто URL».

### Geoapify / MapTiler / Stadia

Тайлы с ключом. Geoapify Free: 3000 credits/день, коммерция с атрибуцией «Powered by Geoapify» ([pricing](https://www.geoapify.com/pricing/)).

## Поиск магазинов (5 км)

Живой geocoder без ключа, который можно честно повесить на список карточек, — это Nominatim/Overpass, см. таблицу выше.

Для десяти [каталожных брендов](https://github.com/bndby/discount-cards/issues/18) честная альтернатива без runtime-ключа: **снимок точек OSM в каталоге** (теги `brand`/`name`, фильтр по алиасам) на этапе сборки приложения. Поиск — гаверсинус на устройстве. Overpass/planet при этом дергает разработчик при релизе, не каждый пользователь. Полнота OSM в Беларуси неполная; обновление — с новой версией приложения.

Живой Places с ключом: Geoapify Places (1 credit ≈ 1 запрос, кэш разрешён). ORS geocoding — 1000/день на Standard, это не каталог магазинов.

## Маршруты (пешком + авто + время)

Без routing-движка нет полилиний и ETA провайдера из [контракта геосортировки](https://github.com/bndby/discount-cards/issues/6). Нулевой ключ здесь означает: только внешний Apple/Google Maps (как PWA) или прямая линия.

**openrouteservice Standard:** бесплатный ключ, Directions 2000/день и 40/мин, профили foot/driving, лимит дистанции далеко больше 5 км ([plans](https://account.heigit.org/info/plans), [restrictions](https://openrouteservice.org/restrictions/)). Collaborative явно запрещает коммерцию; Standard — «free for everyone», отдельного запрета коммерции на плане нет. Endpoint: `api.heigit.org` (старый `api.openrouteservice.org` отключают 2026-09-28). Атрибуция HeiGIT/OSM; результаты CC-BY-SA 4.0. SLA нет.

**Geoapify Routing:** тот же ключ, что Places/тайлы; 1 credit за простой маршрут.

Публичный OSRM — не production.

## Сборки, из которых выбирать

| | Тайлы | Магазины | Маршруты | Ключ | Деньги | Риск |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Ноль ключей** | OpenFreeMap | Снимок OSM в каталоге | Нет: только внешний навигатор (или прямая, как PWA) | Нет | $0 | Карта as-is; Q4 (полилинии и ETA провайдера) не выполняется |
| **B. Один ключ только на маршрут** | OpenFreeMap | Снимок OSM в каталоге | ORS Directions Standard | Один (ORS) | $0 | Карта as-is; точки устаревают до релиза; 2000 маршрутов/день на ключ |
| **C. Один ключ на всё** | Geoapify | Geoapify Places | Geoapify Routing | Один (Geoapify) | $0 до 3000 credits/день | Атрибуция Geoapify; soft quota |

Самохостинг тайлов/ORS/Nominatim — не MVP.

## Источники

- OpenFreeMap: https://openfreemap.org/ https://openfreemap.org/tos/ https://openfreemap.org/quick_start/
- OSMF tiles: https://operations.osmfoundation.org/policies/tiles/
- Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- Overpass Commons: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- ORS plans / restrictions: https://account.heigit.org/info/plans https://openrouteservice.org/restrictions/
- Geoapify pricing: https://www.geoapify.com/pricing/
- MapTiler pricing: https://www.maptiler.com/cloud/pricing/
- Stadia pricing / auth: https://stadiamaps.com/pricing/ https://docs.stadiamaps.com/authentication/
- Protomaps API: https://protomaps.com/api
- MapLibre RN Map: https://github.com/maplibre/maplibre-react-native/blob/main/docs/content/components/map.md
