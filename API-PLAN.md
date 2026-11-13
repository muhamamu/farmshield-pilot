# FarmShield API implementation decisions

Checked against official provider documentation on 13 November 2026.

## Implemented foundation

Browser -> Vite same-origin /api proxy -> Node HTTP API -> provider adapters. The UI never receives provider credentials. The Node service listens on loopback for local development. Cache and in-flight request deduplication reduce provider traffic; weather expires after 15 minutes and satellite catalogue metadata after one hour. Errors are explicit; expired or fictional data is never substituted for live results.

| Endpoint | Purpose | Status |
|---|---|---|
| GET /api/health | Local backend health | Implemented |
| GET /api/weather?location=kano | Seven daily temperature, rain and reference ET₀ values; modelled current conditions | Implemented |
| GET /api/satellite-scenes?location=kano | Five latest Sentinel-2 L2A scene records intersecting a reference region in the past 30 days | Implemented |
| GET /api/nasa-imagery?location=kano&date=YYYY-MM-DD | NASA GIBS regional imagery metadata | Implemented; see NASA-API.md |
| GET /api/nasa-image?location=kano&date=YYYY-MM-DD | Real dated Terra/MODIS true-colour PNG | Implemented; see NASA-API.md |

Supported reference IDs: kano, kaduna, ibadan, abuja. They are public reference coordinates, not farmer locations. Arbitrary URLs and coordinates are not accepted by these endpoints. Searches use an illustrative 0.1-degree regional box, not a farm boundary. The original map and fictional field observations remain marked as sample data.

## Provider choices and access

### Open-Meteo: weather first

Official API: https://open-meteo.com/en/docs

Parameters: Africa/Lagos timezone; current temperature_2m and relative_humidity_2m; seven days of temperature_2m_max, temperature_2m_min, precipitation_sum and et0_fao_evapotranspiration. Returned units and array lengths are checked. Nulls remain null rather than becoming zero. Current weather is modelled, not a farm sensor reading. Reference ET₀ assumes reference vegetation and is not a crop water prescription.

Access: free endpoint used for prototype evaluation only. The pricing page explicitly permits evaluation/prototyping; terms restrict free service to non-commercial use. Before a paid farmer pilot, promotional deployment or commercial rollout, confirm the licence and use a commercial subscription. The monthly Standard plan was listed at USD 29 for one million monthly API calls on the checked page; tax, account-specific terms and future prices are not verified. The data licence separately requires attribution.

Sources: https://open-meteo.com/en/pricing and https://open-meteo.com/en/terms

Commercial configuration: set WEATHER_ACCESS_MODE=commercial and OPEN_METEO_API_KEY in the pilot's own .env. The adapter selects customer-api.open-meteo.com when a key is configured. A production environment without a key refuses weather requests. Never use a VITE_ prefix for the key. No subscription was purchased.

### Copernicus: scene discovery now, pixels next

Official STAC documentation: https://documentation.dataspace.copernicus.eu/APIs/STAC.html

The adapter searches https://stac.dataspace.copernicus.eu/v1/search using sentinel-2-l2a, a longitude-first bbox, acquisition period, limit and descending acquisition date. Public metadata search succeeded without credentials in the live probe. It does not establish access to protected asset downloads, a guaranteed usable image over a plot, or any NDVI result. Whole-scene cloud percentages are not field cloud measurements.

Next step for imagery: register a real field GeoJSON polygon; retrieve and mask image pixels; evaluate pixel-level cloud/quality flags; calculate a vegetation index and dates only where enough valid pixels exist. Sentinel Hub's dashboard supports OAuth clients for processed imagery. Account registration and credentials are still required for that integration; no OAuth client or account was created.

Official processing overview: https://dataspace.copernicus.eu/analyse/apis/sentinel-hub

### FAO WaPOR: later water-productivity layer

FAO confirms its version 3 API does not require a token or credentials. This differs from old version 2 guides. The API/data-download route exists, but is not connected in this iteration. Check exact variable, coverage, frequency, resolution and licence for the selected pilot plots before adopting it.

Sources: https://www.fao.org/in-action/remote-sensing-for-water-productivity/wapor-data-access/en and https://docs.digitalearthafrica.org/en/latest/data_specs/WaPOR_specs.html

### NiMet: local validation/seasonal context

NiMet's seasonal report is relevant to Nigerian agricultural planning, but this investigation has not established a documented production API contract, redistribution permission or a price. Do not scrape its report and describe it as a live operational API.

Source: https://nimet.gov.ng/scp

## Live evidence versus tests

Initial direct provider probes returned HTTP 200 for public Kano coordinates. Weather returned seven dates and modelled current conditions. Copernicus returned dated L2A records with acquisition times and cloud metadata. Automated adapter tests use synthetic fixtures and do not count as provider validation. Browser/API smoke checks are recorded separately when run.

## Runtime and deployment limits

Run npm run dev -- --host 127.0.0.1 --port 4174 to launch both the local API on 4180 and the Vite UI. npm run api runs the backend separately. Node 24 was used. The local API does not enable cross-origin browser requests.

The existing Sites Worker and hosting files remain intact. A static build alone DOES NOT deploy the Node API; deploying requires an explicitly selected backend runtime and same-origin routing. Production public exposure also needs application access controls, shared caching/quotas and operational monitoring. None of these are claimed complete by this local development step.

## Next development slice

1. Register one verified field polygon, crop and planting date with the farmer's permission.
2. Connect authenticated Sentinel processing or another documented raster-access path and show a dated, cloud-qualified image.
3. Store field checks and advisory revisions in a persistent backend.
4. Add agronomist-reviewed crop rules; keep forecasts distinct from recommendations.
5. Validate forecasts and imagery against actual field observations before sending agricultural advice.
