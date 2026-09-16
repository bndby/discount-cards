# OpenFreeMap, снимок магазинов и ORS

Коммерческий all-in-one (Geoapify) всегда требует ключ; публичные OSMF/Nominatim/Overpass как бэкенд приложения запрещены их правилами. MVP нужен $0 и минимум ключей: тайлы — публичный OpenFreeMap без ключа, магазины — снимок OSM в каталоге, пеший и автомобильный маршрут — бесплатный ключ openrouteservice Directions.

Решение: [Определить геосортировку, поиск магазинов и навигацию в мобильном приложении](https://github.com/bndby/discount-cards/issues/19). Заключение [Выбрать совместимую геоплатформу для MVP](https://github.com/bndby/discount-cards/issues/2) про отказ от OSMF/FOSSGIS как бэкенда остаётся; выбор Geoapify как единого вендора этим решением заменён.

## Considered Options

- **Geoapify Free на тайлы, Places и routing** — отвергнут: ключ нужен даже для карты и поиска.
- **Ноль ключей (только внешний навигатор)** — отвергнут: нет полилиний и времени провайдера.
- **Живые Nominatim / Overpass / демо-OSRM** — отвергнуты: лимиты и запрет использовать public instance как backend приложения.
- **MapTiler Free / Stadia Free** — отвергнуты: коммерция не разрешена.
