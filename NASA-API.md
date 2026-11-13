# NASA satellite imagery integration

Implemented 13 November 2026. Provider: NASA Global Imagery Browse Services (GIBS).

## What now works

- Select a public Nigerian reference location in Regional data.
- Choose a requested imagery day within the previous 30 days, excluding today.
- Load a real Terra/MODIS true-colour regional image from NASA through the FarmShield backend.
- View the requested date, reference location, projection and attribution.
- Open the returned image separately. The fictional field map remains separate.

No API key, paid subscription or Earthdata login was used for this public GIBS image service. This does not establish unauthenticated access to other NASA products or raw science files.

## Endpoints

`GET /api/nasa-imagery?location=kano&date=2026-11-12` returns metadata after retrieving/validating the image.

`GET /api/nasa-image?location=kano&date=2026-11-12` serves the PNG bytes. The Node HTTP adapter preserves binary bytes, rather than converting an image to text.

The backend uses NASA's documented WMS 1.1.1 GetMap service:

`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`

Layer: `MODIS_Terra_CorrectedReflectance_TrueColor`. Output is a 768 x 768 PNG, EPSG:4326, with a longitude-first bounding box spanning one degree around the public reference point. Available locations are Kano, Kaduna, Ibadan and Abuja. Source imagery is nominally 250 m; output image dimensions do not increase native detail.

The server accepts only fixed locations and valid recent dates. It does not accept arbitrary provider URLs or WMS parameters. Requests have a 20-second upstream timeout, PNG content/signature/dimension checks, a four-megabyte response cap, one-hour caching, in-flight deduplication and a maximum of 16 cached images. NASA service exceptions and image failures return explicit errors, never a generated substitute image.

## Interpretation limits

This is regional browse imagery, not a farm diagnosis. Clouds, haze, sensor artefacts and missing coverage can obscure land. Requested day is not an exact acquisition timestamp or proof of clear pixels. A successful PNG response is not a quality assessment. No NDVI, land-surface temperature, soil-moisture or harvest estimate is calculated. The black/transparent strip in the tested Kano image is treated as possible missing coverage, not drought evidence.

The original green outlined farm map is generated demo imagery. It is not replaced or relabelled as NASA data.

## Verification

Direct NASA probe returned HTTP 200, image/png and a 286,167-byte PNG for the public Kano region requested for 12 November 2026. The saved probe was visually inspected. Browser verification confirmed the app loaded a 768 x 768 image from its own `/api/nasa-image` route and displayed the requested date, NASA attribution and limitations. Browser error query returned an empty list. Evidence: qa/nasa-kano-probe.png and qa/nasa-connected.png.

All 25 API tests passed, including ten new NASA cases for date boundaries, axis order, metadata/binary separation, caching, concurrent requests, provider exceptions, invalid images, invalid locations and queries, binary response preservation and error redaction. These tests use synthetic transport fixtures; they are not presented as satellite observations. Production build passed. Mobile browser verification of the new NASA viewer has not been performed.

## Official references

- [NASA GIBS overview and acknowledgement](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api)
- [NASA GIBS API access basics and WMS examples](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [NASA GIBS visualization characteristics](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/)

Next development should register actual field boundaries and select an appropriate science-data product with cloud/quality masking. GIBS browse colours must not be reverse-engineered into precise agronomic measurements.
