# Kano satellite explorer

Current product direction, clarified 13 November 2026: an interactive satellite basemap showing actual land, buildings, farms, roads and towns, initially focused on Kano. The former nationwide NASA browse-image gallery is not the primary experience.

## Implemented

- Leaflet 1.9.4 map using real Esri World Imagery tiles and an optional Esri place-label overlay.
- Pan, zoom, keyboard movement, scale and provider attribution.
- Kano city and countryside shortcuts, a return-to-start control, and a full-screen control where the browser supports the Fullscreen API.
- Pilot navigation constrained to a bounding rectangle derived from the Kano state dataset. This rectangle can include neighbouring land at its corners; it is not a polygon mask.
- Click to pin a location and show its coordinates. A pin does not create a field registration or assign a farmer, crop, or stress diagnosis.
- Last map centre/zoom saved in browser-local storage under a versioned key, validated before restoration.
- Existing sample advisory workflow retained in a clearly labelled expandable panel. Weather/catalogue tools are below the workspace and collapsed by default.
- Previous NASA APIs and region data remain in the repository for later analytical work.

## Source and access

Imagery service: https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer

Official item: https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9

The official item metadata returned public access and credits to Esri, Vantor, Earthstar Geographics and the GIS User Community. Credits are displayed on the map. This implementation uses the published public service directly, without an undocumented Google endpoint, a Google key, or a fabricated replacement image. No basemap tiles are bulk-downloaded or packaged for offline use.

The item references the Esri Master License Agreement. Public accessibility is not a blanket commercial-use grant. Confirm the appropriate provider account/licence and production endpoint before public commercial rollout. No account was created and no subscription purchased.

Imagery date, sharpness and coverage vary by place and zoom. It is a satellite/aerial imagery basemap, not live photography or a dated scientific monitoring product. There is no 3D terrain/globe, land classification, field ownership lookup, crop-health analysis or harvest estimate in this change.

## Context7 implementation references

Context7 library: /leaflet/leaflet/v1.9.4. The implementation used its map click, tile-layer, bounds and control documentation. The React effect removes the map and disconnects its ResizeObserver on cleanup; callback refs avoid stale location handlers. Controls use library icons and standard mapping geometry.

## Verification

- Browser loaded 18 raster/label tiles from services.arcgisonline.com; all inspected tiles had nonzero natural image dimensions.
- City and countryside shortcuts changed the displayed view and zoom.
- Zoom control reached zoom 16 with detailed roads, built-up land and open plots visible.
- Click-to-pin displayed real clicked coordinates in the inspector, without attaching the sample crop records.
- Labels switched off and back on.
- Keyboard movement changed longitude from 8.5920 to 8.5989 at zoom 14; after reload, the same centre and zoom were restored.
- Phone viewport: 390 CSS px, document content width 375 CSS px, map width about 341 CSS px; no horizontal overflow. Real tiles rendered.
- Browser error-log query returned an empty list.
- Production build, 30 API tests and four hosting checks passed.
- Fullscreen control and clipboard-copy action are implemented but not separately browser-tested in this pass.

Evidence: qa/kano-explorer-desktop.png, qa/kano-explorer-mobile.png, qa/kano-explorer-preview.png and qa/kano-style-comparison.png. The combined comparison checks preservation of the approved green/ivory visual system; map content, page focus and collapsed sample panel intentionally differ following the user's clarification.
