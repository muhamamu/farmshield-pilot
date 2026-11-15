# Prototype Instructions

Current direction (user clarification): the primary experience is a Google Earth-like pan-and-zoom satellite basemap showing actual land, farms, roads, villages and towns. Start with all Nigeria in view and support place search across Nigeria, filtering out other countries. Preserve the forest-green/ivory visual language and advisory workflow. Use account-owned farms and actual field inputs; show an empty state when none exist. Earlier NASA nationwide snapshots are research/secondary capabilities, not the primary map.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

User design preference: friendly and uncluttered. Keep the Nigeria map as the main screen, with secondary map options collapsed and advisories, English/Hausa translation, recent activity and data tools in a single Workspace drawer. Use restrained motion and respect reduced-motion settings.

Keep the current visual style. Give signup/account and admin actions visible button borders, icons and clear labels. Add subtle interaction and panel motion; keep map content and review data stationary. Keep navigation readable on narrow screens.

Supabase is the primary farm store. Persist farm details, outlines, observations, plans and saved drafts to the signed-in account. Keep legacy device/backup import explicit and preserve source records until an import succeeds. Remove fictional farms, seeded activity, sample selectors and reset-demo actions from product UI. Keep weather errors concise and place provider configuration in deployment documentation.

Data tools should feel like a useful farm conditions view: use saved farms, a map pin or nationwide place search; load sources automatically. Never silently default to a reference city. Show dated weather, rainfall and satellite catalogue records with plain-language limits, compact cards and honest unavailable states.
