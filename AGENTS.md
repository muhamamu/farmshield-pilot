# Prototype Instructions

Current direction (user clarification): the primary experience is a Google Earth-like pan-and-zoom satellite basemap showing actual land, farms, roads, villages and towns. Start in Kano and keep the pilot focused there; expand later. Preserve the forest-green/ivory visual language and advisory workflow. Never label fictional farmer records or sample stress alerts as observations of a clicked map location. Earlier NASA nationwide snapshots are research/secondary capabilities, not the primary map.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

User design preference: friendly and uncluttered. Keep the Kano map as the main screen, with secondary map options collapsed and advisories, English/Hausa translation, recent activity and data tools in a single Workspace drawer. Use restrained motion and respect reduced-motion settings.
