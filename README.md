# FarmShield pilot

Current primary experience: a real, interactive Kano satellite explorer. Pan and zoom around actual land, roads, buildings and farms; switch labels; jump to Kano city or the countryside; click to pin coordinates. The map remembers its last position. Sample advisory records are separately labelled and are not associated with a clicked location. See MAP-INTEGRATION.md for sources and verification.

Earlier NASA regional snapshots remain available in the backend code for later work; the nationwide gallery is no longer the primary UI.

A development pilot for a Nigerian agricultural cooperative adviser. Sample farmers, field positions, field observations and the map are fictional or generated. A separate regional panel connects to real Open-Meteo forecasts and Copernicus Sentinel-2 catalogue metadata.

## Run

Use Node.js and npm:

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4174
```

Open http://127.0.0.1:4174/ . The dev command starts the local Node API on port 4180 and Vite on 4174. Build with `npm run build`. Run adapter tests with `npm run test:api` and hosting checks with `npm run test:sites` after building.

In Regional data, select Kano, Kaduna, Ibadan or Abuja and click Connect sources. The panel distinguishes actual regional forecast/catalogue results from the sample fields. The NASA Earth Observation viewer additionally loads real, dated Terra/MODIS true-colour imagery using public NASA GIBS; no NASA key is needed for this service. See NASA-API.md for interpretation limits and verification. Provider errors are shown without substituting demo values. No account is needed for the public catalogue search. Weather uses prototype evaluation access locally; commercial use requires the paid provider endpoint and a server-side key. See API-PLAN.md and .env.example.

## Demonstrate

1. Select Amina's plot from the map or table.
2. Switch English/Hausa and edit an advisory draft.
3. Preview and save the sample message; recent activity updates. No SMS is sent.
4. Record a field check with soil condition and notes. Dry or unassessed conditions flag follow-up.
5. Select another field to view its crop, stage and draft.
6. Export the session as JSON or reset the sample state.

Tab-local React state resets on reload. This is deliberately a pilot interface, not an agronomic decision system. Review all language and guidance before using them with actual farmers.

Source design and visual verification are documented in design-qa.md. API flow verification is in verification-api.md. The source project is isolated from the existing workspace application. No deployment was performed. A static Sites build does not deploy the new Node API; a backend deployment and routing decision is still required.
