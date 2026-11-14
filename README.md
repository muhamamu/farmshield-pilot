# FarmShield

Live app: https://farmshield-pilot.vercel.app

FarmShield combines a real Kano satellite map with account-owned farm records,
field observations, advisory drafts and admin verification. It contains no seeded
farmers or fictional field alerts.

## Accounts and farms

Sign in to register a farm. Farm details, reference pins, land outlines, observations,
soil readings, planting plans and saved advisory drafts persist directly in Supabase.
They load wherever the farmer signs in. Unsaved text drafts stay in memory until saved.

Workspace > My farms offers an explicit import for older device farms and any previous
cloud backup. An import preserves edited cloud records and only removes device records
after a successful upload. The latest existing verification submissions were carried
into the primary farm store automatically.

Farm verification remains separate: farmers explicitly submit their location and contact
details, and assigned admins approve, reject or request corrections. Private field notes
stay private. Deleted farms retain their data and review history and can be restored.
Currently approved totals exclude deleted farms; total ever approved counts each farm once.

## Map and weather

Pan and zoom real satellite imagery in Kano, toggle place labels and draw farm outlines.
The camera position is remembered on the device. Imagery dates and detail vary; a pin or
outline is not proof of ownership. See MAP-INTEGRATION.md.

Regional data connects to weather and Sentinel-2 catalogue services. Forecast failures
show an unavailable state without inventing values. Production Open-Meteo access needs
OPEN_METEO_API_KEY on the server. See DEPLOYMENT.md and .env.example.
Earlier NASA research endpoints remain available; see NASA-API.md.

## Development

Use Node 22 or newer:

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4174
npm test
npm run build
```

The dev command starts the Node API on port 4180 and Vite on the requested port.
Build output supports Vercel and the existing Sites package.

Supabase uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the browser.
Never put a service-role key in Vite variables. Database policies restrict saved farm
records to their owner; review snapshots use separate owner/admin access rules.

Applied migration sources include supabase/registration-review.sql,
supabase/farm-lifecycle.sql and supabase/cloud-farms.sql. Transactional SQL tests in
`tests/*-access.sql` verify access controls and roll back their fixtures.
See verification-cloud-farms.md for verification results and remaining limitations.
