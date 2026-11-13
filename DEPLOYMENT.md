# FarmShield deployment

## Verification

Run `npm test` and `npm run build`. The build prepares both Vercel's
`dist/client` output and the existing Sites package. Vercel routes `/api/*`
to `api/index.js`, which uses the same API services as local development.
Unknown API routes return JSON errors rather than the HTML app shell.

## GitHub and Vercel

Use the `farmshield-pilot` repository under the intended GitHub account.
Exclude `.env*` except `.env.example`, `.vercel`, `data`, `node_modules`,
and `dist`. Import the repository into the intended Vercel team using
the committed `vercel.json` settings. Use Node 22 or newer.

After deployment, verify the map, farm registration and `/api/health`.
Check that `/api/missing` returns 404 JSON, and deep links load the app.

Production regional weather intentionally returns
`WEATHER_CONFIGURATION_REQUIRED` without a paid server-side
`OPEN_METEO_API_KEY`. Do not disable this check to make deployment pass.
The basemap and NASA endpoints do not require that key.

## Supabase

The workspace includes email-link sign-in and manual account backup/restore.
Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel.
The farmShield project is thgxjorxbwyuunfcwvib. Its private backup migration
is applied. Never expose a service-role or secret key in Vite variables.

Configure the production URL in Supabase Auth URL Configuration (Site URL
and allowed redirects). Email sign-in uses the project's email provider;
configure custom SMTP before public signups if the default provider limits
delivery to organization members.

Backing up replaces that account's previous snapshot. Restoring adds
missing farms while keeping local records and local deletion tombstones.
No browser records are uploaded automatically.
