# API integration verification — 13 November 2026

Story: choose a public Nigerian reference region -> click Connect sources -> same-origin Vite proxy -> local Node API -> Open-Meteo and Copernicus STAC -> normalized, attributed regional data displayed separately from fictional fields.

## Results

| Boundary | Evidence |
|---|---|
| UI renders | Regional data panel, location selector and Connect sources visible in browser |
| Client to backend | Clicking Connect sources transitions both providers from Not connected to Loading to Connected |
| Weather provider | Direct probe HTTP 200; browser displayed seven daily forecast entries for 13–19 November, with temperature, rain and ET₀ |
| Satellite provider | Direct probe HTTP 200; browser displayed five dated L2A scene records with acquisition IDs and whole-scene cloud percentages |
| Response to UI | Both providers attributed, retrieval times shown in WAT, demo field values separately marked simulated |
| Cache | Refresh showed cached retrieval metadata and retained the original fetched-at timestamp |
| Console | Browser error-log query returned [] |
| Build | npm run build passed after correcting an unavailable Phosphor icon export |
| Automated checks | 15 API tests and 4 existing hosting tests passed |

Screenshot: qa/api-connected.png, inspected after capture. No screenshot or fixtures are used as live provider results.

## Test coverage

Missing values versus zero, provider unit mismatch, malformed series, missing current conditions, cache expiry, simultaneous request deduplication, credential redaction, commercial/production key requirement, provider errors, malformed JSON, expired-cache rejection, invalid locations and extra parameters, method/routing restrictions, empty scene results, scene sorting and cloud-value normalization, bounding-box ordering.

## Development constraints

- Forecast values may change between requests/model runs; they are not measurements from the sample farms.
- No NDVI, thermal imagery analysis, crop diagnosis or irrigation prescription is implemented.
- No commercial weather subscription or satellite processing credentials were obtained.
- The Node API is local, separately served from the protected Sites Worker; static hosting output does not include the backend runtime.
- Automated adapter tests use fixtures. Live provider requests and browser verification are separately documented above.
- Mobile API-panel behavior has not been browser-tested in this iteration; the existing mobile map workflow was tested previously.
