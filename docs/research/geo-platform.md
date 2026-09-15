# Geo platform for MVP (OSM maps + brand POI + walking/driving routes)

**Issue:** [#2](https://github.com/bndby/discount-cards/issues/2)  
**Date:** 2026-09-15  
**Scope:** Production-acceptable stack for iOS/Android React Native + TypeScript. Search radius 5 km; card screen shows OSM-based map plus walking and driving routes (with travel times) to the nearest brand store; on geo/network failure hide map/routes; foreground location only.

## Summary

Public OSMF/FOSSGIS **services** (tiles, Nominatim, Overpass, demo OSRM) are donation-funded, best-effort, heavily rate-limited, and often **not** licensed for apps where maps/routing are a substantial feature. OpenStreetMap **data** remains free under ODbL with attribution. For MVP, use a **commercial OSM-based provider** (or a small set of them) with MapLibre on React Native; do not hard-depend on public community endpoints.

## Product constraints (already decided)

| Constraint | Implication |
| --- | --- |
| 5 km store radius | POI API must allow ≥ 5 km (ORS live POIs max radius is **2 km** — unsuitable alone) |
| Walking + driving + ETAs | Need routing profiles for foot and car with duration |
| Offline / geo failure | Map and routes optional; degrade gracefully |
| Foreground location only | No background tracking implications for ToS |
| React Native + TypeScript | Prefer MapLibre RN or configurable tile overlay |

---

## 1. Acceptable providers by concern

### 1.1 Map rendering (SDK) + tiles

| Option | Role | Production notes |
| --- | --- | --- |
| **[@maplibre/maplibre-react-native](https://maplibre.org/maplibre-react-native/)** | Native MapLibre map; `mapStyle` URL or Style JSON | First-party OSS; attribution controls; works with any MapLibre-compatible style ([docs](https://github.com/maplibre/maplibre-react-native/blob/main/docs/content/components/map.md)) |
| **[react-native-maps](https://github.com/react-native-maps/react-native-maps)** | Google/Apple maps by default; can add custom URL tiles | Fine for markers/polylines; OSM look requires a **tile URL from a provider that allows app use**, not OSMF defaults |
| **MapTiler Cloud** | OSM-derived vector/raster styles + sessions | Free: personal/non-commercial; **Flex ($30/mo)** for commercial; 25k map sessions / 500k API requests included on Flex ([pricing](https://www.maptiler.com/cloud/pricing/)) |
| **Geoapify** | Map styles/tiles + Places + Routing | Free: 3 000 credits/day, commercial allowed **with attribution**; paid plans for volume ([pricing](https://www.geoapify.com/pricing/)) |
| **Stadia Maps** | Vector/raster basemaps + routing + geocoding | Free: commercial **not** allowed; **Starter ($20/mo)** allows commercial; API key for mobile ([pricing](https://stadiamaps.com/pricing/), [auth](https://docs.stadiamaps.com/authentication/)) |
| **OSMF `tile.openstreetmap.org`** | Community raster tiles | Best-effort, **no SLA**; apps must identify via User-Agent; no bulk/offline; commercial/donation-funded apps warned access may be withdrawn ([Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)) |
| **FOSSGIS `tile.openstreetmap.de`** | Community tiles | **Apps that load tiles independently are prohibited without prior operator consent** ([FOSSGIS ToS](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)) |
| **OSMF vector tiles** | Shortbread MVT | Same class of limits: best-effort, attribution, no bulk, switchable URL recommended ([Vector Tile Usage Policy](https://operations.osmfoundation.org/policies/vector/)) |

**Attribution:** OSM data is ODbL; show © OpenStreetMap contributors / copyright link as required ([OSM copyright](https://www.openstreetmap.org/copyright)). Hosted styles usually also require provider attribution (MapTiler logo on Free; Geoapify “Powered by…”; Stadia Maps + OpenMapTiles + OSM).

**Switch2OSM** lists commercial tile hosts (MapTiler, Stadia, Geoapify, Jawg, Thunderforest, etc.) as alternatives when community tiles do not fit ([providers](https://switch2osm.org/providers/)).

### 1.2 Brand / store POI search (within 5 km)

| Option | Fit for brand stores in radius | Production notes |
| --- | --- | --- |
| **Geoapify Places API** | Strong: categories + text/name, OSM-sourced; docs state results may be cached without limit | Free commercial with attribution; 1 credit ≈ 1 simple request ([Places docs](https://apidocs.geoapify.com/docs/places/), [pricing](https://www.geoapify.com/pricing/)) |
| **MapTiler Search & Geocoding** | Place/POI search with API key | Commercial on Flex+ ([API](https://docs.maptiler.com/cloud/api/geocoding/), [pricing](https://www.maptiler.com/cloud/pricing/)) |
| **Stadia Geocoding & Search** | Forward/reverse/autocomplete | Commercial from Starter ([docs hub](https://docs.stadiamaps.com/)) |
| **openrouteservice POIs** | **Weak for this product:** max search radius **2 km** | Does not meet 5 km requirement ([ORS restrictions](https://openrouteservice.org/restrictions/)) |
| **Nominatim (`nominatim.openstreetmap.org`)** | Geocoding, not a store catalog API | Absolute max **1 req/s for the whole app**; no systematic POI download; apps must switch provider without app update; commercial caution ([Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)) |
| **Public Overpass (`overpass-api.de` etc.)** | Can query `shop`/`brand` tags in a bbox | Operators discourage apps relying on public instances as backend; ~10k req/day / ~1 GB/day guideline; rate slots/429 ([Overpass Commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)); FOSSGIS ToS also covers overpass-api.de |
| **Photon demo (`photon.komoot.io`)** | Fast geocoding | Reasonable use only; heavy use throttled/banned; no availability guarantee ([Photon README](https://github.com/komoot/photon)) |
| **Curated in-app brand locations** | Deterministic MVP | Defer live OSM completeness; optional later enrichment |

### 1.3 Walking / driving routing (geometry + travel time)

| Option | Profiles | Production notes |
| --- | --- | --- |
| **openrouteservice Directions (live API + key)** | Includes walking and driving (and more) | Explicit directions product; query distance limits far above 5 km; API Playground + signup ([services](https://openrouteservice.org/services/), [restrictions](https://openrouteservice.org/restrictions/), [GitHub](https://github.com/GIScience/openrouteservice)) |
| **Geoapify Routing** | Car/foot (among others); 1 credit per simple route | Same vendor as Places/tiles; Free allows commercial with attribution |
| **Stadia Maps Routing** | Car, bicycle, foot, etc.; weekly OSM updates | Commercial from paid plans; mobile via API key ([routing docs](https://docs.stadiamaps.com/routing/)) |
| **GraphHopper Directions API** | Car/foot/etc. | **Free plan: non-commercial** (production commercial on inquiry); paid Basic+ for commercial ([pricing](https://www.graphhopper.com/pricing/), [terms excerpt via pricing notes](https://www.graphhopper.com/pricing/)) |
| **Self-hosted OSRM / Valhalla / ORS** | Full control | Acceptable long-term; ops cost deferred for MVP |
| **Public OSRM / FOSSGIS `routing.openstreetmap.de`** | car / bike / foot demos | **Not a guaranteed production API:** FOSSGIS: ≤ 1 req/s, no availability guarantee, commercial only if service is **not** a substantial part of the offering ([FOSSGIS ToS](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)). OSRM software is fine to self-host ([HTTP API](https://raw.githubusercontent.com/Project-OSRM/osrm-backend/master/docs/http.md)); the public demo is not an SLA product. |

---

## 2. Limits, ToS, and risks of public OSM **services**

OpenStreetMap repeatedly separates **free data** from **limited donated services**:

> “Although OpenStreetMap is open data, we cannot provide a free-of-charge map API or map tiles for third-parties.”  
> — [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)

OSMF Terms: services “as is” / “as available”; no warranty of uninterrupted or error-free operation; APIs may change or end ([OSMF Terms of Use](https://osmfoundation.org/wiki/Terms_of_Use)).

### 2.1 Tiles (`tile.openstreetmap.org` / FOSSGIS)

| Risk | Source |
| --- | --- |
| No SLA; blocking without notice | [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) |
| Must identify app (User-Agent); library defaults blocked | same |
| No bulk download / offline prefetch from community tiles | same |
| Commercial/donation-seeking apps: access may be withdrawn | same |
| FOSSGIS: independent app tile loading **forbidden without consent** | [FOSSGIS ToS](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/) |

### 2.2 Nominatim

| Risk | Source |
| --- | --- |
| ≤ 1 request/second **per application** (all users combined) | [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) |
| Systematic area/POI scraping forbidden | same |
| Apps must be able to switch service **without software update** | same |
| Periodic bulk geocoding from apps strongly discouraged | same |

### 2.3 Overpass

| Risk | Source |
| --- | --- |
| Public mission is shared capacity (~30k daily users) | [Overpass Commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) |
| Explicit anti-pattern: “Setting up an app for more than just OSM mappers and relying on the public instances as backend” | same |
| Soft guideline ~10 000 req/day and ~1 GB/day; 429 under load | same |

### 2.4 Public routing (OSRM demos / FOSSGIS)

| Risk | Source |
| --- | --- |
| Data free; **routing servers are not** | [FOSSGIS ToS](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/) |
| Max 1 request/second on FOSSGIS routing | same |
| Commercial use only if not a **substantial** part of the product (directions sketches OK as example of non-substantial) | same |
| Single-server class; **no availability guarantee**; revoke anytime | same |

**Conclusion:** Public OSM tile/geocode/Overpass/routing endpoints are fine for interactive mapper tooling and light experimentation. They are **not** an acceptable production routing/map SLA for an app whose card screen centers on map + routes. Treat them as non-goals for MVP backends.

---

## 3. React Native integration notes

- Prefer **MapLibre React Native** with a provider style URL (vector tiles). Attribution can be shown via MapLibre ornaments (`attribution` / `showAttribution`) ([Map component docs](https://github.com/maplibre/maplibre-react-native/blob/main/docs/content/components/map.md)).
- Keep **base URL / API keys** configurable (remote config or build flavors) so providers can be swapped without a forced store release — aligns with OSMF Nominatim/tile guidance to avoid hard-coding.
- Draw route polylines and store markers from routing/POI JSON; do not depend on Google Directions if the product requires OSM-based routing.
- On failure: hide map + routes and show a clear message (already product policy); do not retry aggressively against community APIs.

---

## 4. What to defer

| Defer | Why |
| --- | --- |
| Self-hosted OSRM / Valhalla / ORS / Overpass / Nominatim / Photon | Ops and update pipelines; revisit at scale or if vendor cost hurts |
| Offline map packs / tile prefetch | Forbidden on OSMF/FOSSGIS tiles; needs provider that licenses offline or on-prem |
| Public Nominatim / Overpass / FOSSGIS / OSMF tiles as production backends | ToS + capacity + no SLA |
| ORS POIs as sole store search | 2 km radius cap vs 5 km product need |
| GraphHopper Free in production commercial | Free plan is non-commercial |
| Turn-by-turn voice navigation, traffic, matrix batching | Out of MVP card-screen scope |
| Perfect OSM brand coverage | Data completeness varies; may need catalog overrides later |

---

## Recommendation

### MVP stack (production-acceptable)

1. **Map SDK:** `@maplibre/maplibre-react-native` with a hosted **OSM-derived** style (not OSMF/FOSSGIS community tile URLs).
2. **Tiles / basemap (pick one commercial host):**
   - **Preferred default:** **Geoapify** maps (one vendor with Places + Routing; Free allows commercial **with required attribution**; upgrade when 3 000 credits/day is tight), **or**
   - **MapTiler Cloud Flex** if you want MapTiler styles/sessions as the map home, **or**
   - **Stadia Maps Starter+** if you prefer Stadia styles + their routing/geocoding (Free plan disallows commercial).
3. **Brand POI / nearest store within 5 km:** **Geoapify Places** (name/category + radius; cache responses). Do **not** use public Nominatim/Overpass as the app backend. Do **not** rely on ORS POIs alone (2 km max). Optional later: curated brand coordinates in the bundled catalog as fallback.
4. **Routing (walking + driving + duration):** **Geoapify Routing** *or* **openrouteservice Directions** (`foot-walking` / `driving-car`) with an API key *or* **Stadia routing** on a paid plan. Do **not** call `routing.openstreetmap.de` / public OSRM demos as the production API.
5. **Failure mode:** already decided — hide map/routes with a clear message; local card features keep working.
6. **Compliance:** ODbL/OSM attribution + provider attribution; identifiable User-Agent on any residual community calls; never hard-code community endpoints as the only path.

### Minimal vendor shapes

| Shape | Maps | POI | Routing | When |
| --- | --- | --- | --- | --- |
| **A — single vendor (recommended for MVP)** | Geoapify + MapLibre | Geoapify Places | Geoapify Routing | Fastest integration, one bill, Free OK for early commercial with attribution |
| **B — MapTiler + ORS** | MapTiler Flex + MapLibre | MapTiler Geocoding **or** Geoapify Places | openrouteservice Directions | Prefer MapTiler cartography |
| **C — Stadia** | Stadia Starter+ + MapLibre | Stadia Search | Stadia Routing | Prefer Stadia privacy/pricing model |

### Explicit non-goals for MVP backends

Public `tile.openstreetmap.org`, FOSSGIS tiles/routing/Overpass, public Nominatim, Photon demo, and GraphHopper Free (for commercial production) as sole dependencies.

---

## Sources (primary)

- OSMF Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
- OSMF Vector Tile Usage Policy: https://operations.osmfoundation.org/policies/vector/
- Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
- OSMF Terms of Use: https://osmfoundation.org/wiki/Terms_of_Use
- OSM copyright / ODbL notice: https://www.openstreetmap.org/copyright
- FOSSGIS OSM server terms (tiles, routing, Overpass): https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/
- Overpass public instance commons/quotas: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- Switch2OSM providers: https://switch2osm.org/providers/
- MapLibre React Native: https://maplibre.org/maplibre-react-native/ and https://github.com/maplibre/maplibre-react-native
- MapTiler Cloud pricing: https://www.maptiler.com/cloud/pricing/
- MapTiler Geocoding API: https://docs.maptiler.com/cloud/api/geocoding/
- Geoapify pricing: https://www.geoapify.com/pricing/
- Geoapify Places: https://apidocs.geoapify.com/docs/places/
- Stadia Maps pricing: https://stadiamaps.com/pricing/
- Stadia authentication (mobile API keys): https://docs.stadiamaps.com/authentication/
- Stadia routing: https://docs.stadiamaps.com/routing/
- openrouteservice services: https://openrouteservice.org/services/
- openrouteservice API restrictions: https://openrouteservice.org/restrictions/
- openrouteservice backend (self-host / live API): https://github.com/GIScience/openrouteservice
- GraphHopper pricing (Free = non-commercial): https://www.graphhopper.com/pricing/
- OSRM HTTP API (self-host): https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md
- Photon demo limits: https://github.com/komoot/photon
