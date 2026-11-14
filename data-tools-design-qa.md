# Data tools redesign verification

Source: user screenshot of Workspace > Data tools, supplied 14 November 2026.
Goal: replace the reference-city connection screen with farm/location conditions.

Implemented: location selector, map-pin and place-search options, automatic independent
weather/catalogue requests, rainfall total and forecast range, daily forecast rows,
dated Sentinel-2 records, cloud coverage and collapsible scene identifiers. Missing
locations prompt selection. Missing providers never produce fictional readings.
Changing location cancels old requests and hides results with a different coordinate key.

Backend accepts a single reference id or strictly validated lat/lon pair within the
Nigeria map extent. Provider hosts remain fixed. Shared cache is capped at 128 entries.
Production commercial weather key requirements remain in place.

Validation: 95 tests passed; production build passed. Includes coordinate request,
invalid-query, satellite box and actual React rendering tests for empty/farm/pin states.
No connected browser or cloud browser tool is available in this session. Visual
comparison, focus/keyboard interactions and live location switching could not be
verified in a browser. No browser-verified fidelity claim is made.

final result: blocked
