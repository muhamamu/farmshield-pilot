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

### Accounts and farm verification

The app provides `/signup`, `/signin`, `/reset-password` and `/update-password`.
Confirmation and recovery emails return to the configured Site URL; the auth
recovery event opens the new-password form. Email confirmation and real email
delivery still require an end-to-end check with the intended SMTP provider.

The `farm_registration_reviews` migration is applied to the farmShield project.
Its source is `supabase/registration-review.sql`. It adds immutable farm
submissions, immutable admin decisions, and a protected admin membership table.
Private account backups remain separate. Users explicitly choose which local
farms to submit and consent to sharing their location and contact details.

Create and confirm the intended administrator's account first, then assign that
specific account through the trusted Supabase SQL editor:

```sql
insert into public.farmshield_admins(user_id)
select id from auth.users
where lower(email)=lower('REPLACE_WITH_VERIFIED_ADMIN_EMAIL')
  and email_confirmed_at is not null
on conflict (user_id) do nothing;
```

No account is automatically made admin. Admin membership cannot be written
through the browser API, even by an admin. Reload after provisioning to reveal
the Admin link. `/admin` checks membership; RLS also enforces access independently.
Approval requires location, farm details and contact checks plus review notes.
New submissions create new review snapshots; an old approval never verifies
edited local details. Reviews do not establish land ownership.

Run `tests/registration-access.sql` as one transaction with a trusted database
operator to verify owner isolation, anti-escalation rules, admin decisions,
approval checks, immutable history and anonymous denial. Fixtures roll back.
Submission lists are loaded in pages so totals include the full visible history.

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

### Farm deletion and approval totals

The farm_lifecycle_state migration is applied; its source is supabase/farm-lifecycle.sql. A protected parent row tracks deletion across all submissions for one owner/farm pair. Owners and admins can mark a farm deleted or restore it. Server triggers set the timestamp and actor, preserve immutable reviews, and block new reviews or resubmission until restoration.

Currently approved counts active farms whose latest submission is approved. Total ever approved counts distinct owner/farm pairs with any approval, including deleted farms or farms with a newer pending submission. Repeated approvals never inflate that total. Admin and profile lists include deleted filters and restore actions. Browser farm lists synchronize cloud deletion on map entry and browser focus; historical local deletion tombstones synchronize when the owner returns to the map. Unsubmitted drafts stay local.

Run tests/farm-lifecycle-access.sql in one transaction to verify deletion isolation and restoration; fixtures roll back. Weather remains unavailable until OPEN_METEO_API_KEY is set in Vercel production and the app is redeployed. Farmers see a plain unavailable message; admins get setup instructions.

