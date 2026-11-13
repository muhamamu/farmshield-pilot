# FarmShield design QA

## Latest pass — Kano explorer clarification

final result: passed

Current source truth: existing approved green/ivory application plus the user's explicit request for a Google Earth-like pan-and-zoom view of actual land, starting in Kano. The former fictional field labels and primary nationwide gallery intentionally do not appear on the real map.

Evidence: qa/kano-style-comparison.png (previous approved reference and current rendered interface together), qa/kano-explorer-desktop.png, qa/kano-explorer-mobile.png. The reference is 1487 x 1058 px, normalized to 1425 x 1013 for the comparison. Desktop CSS viewport 1440 x 1024; the screenshot is a full-page capture, and the comparison uses the top 1425 x 1013 content region. Mobile CSS viewport 390 x 844, full-page content capture. Screenshot placement of fixed sidebar follows full-page capture behavior; no capture-induced alignment finding was filed.

Five fidelity surfaces: DM Sans heading/body hierarchy retained; forest-green sidebar, ivory surface and fine rules retained; map expanded intentionally to make navigation primary; actual satellite imagery is sharp enough to distinguish roads/buildings/open plots at the tested zoom; copy distinguishes pins, sample records and real basemap imagery. Controls, inspector and attribution were inspected in readable desktop/mobile captures. No actionable P0/P1/P2 layout issue identified. Minor P3 typography refinements from prior passes remain optional.

Core functionality verified: real raster tiles, zoom, city/countryside shortcuts, labels, location pin, keyboard movement and view restoration. Mobile map fits the viewport without horizontal overflow. Browser error query returned no errors. Build and 34 automated checks passed. Fullscreen/clipboard and a formal assistive-technology audit remain unverified. See MAP-INTEGRATION.md.

The historical QA record below applies to the earlier demo and API panels.

API development update (13 November 2026): the new Regional data panel is an intentional functional addition requested after visual approval. Its browser evidence is qa/api-connected.png, with data-flow verification in verification-api.md. The original source comparison below documents the earlier map/advisory implementation, not pixel fidelity of the added panel. The original sample map remains illustrative.

final result: passed

Source visual truth: C:/Users/muham/.codex/generated_images/01a1d423-3a7c-7571-86c4-b30d6b92c039/exec-fc714c8e-305a-492d-8c37-6fb412bcb7fb.png

Implementation: http://127.0.0.1:4174/

Evidence: qa/desktop.png, qa/mobile.png, qa/comparison.png, qa/detail-comparison.png.

Desktop CSS viewport: 1440 x 1024, reported device density approximately 1. Source pixels: 1487 x 1058. Browser content screenshot: 1425 x 1013, excluding browser/scrollbar area. Reference was normalized to 1425 x 1013 for the combined comparison. No density-based findings were filed. An earlier blank screenshot from a background tab was discarded and replaced with a rendered screenshot from the visible test tab. Mobile CSS viewport: 390 x 844; full-page screenshot covers vertically stacked content.

State: Fields, Amina selected, English draft, initial sample activity. Full-view comparison and focused inspector/activity comparison were opened together with the reference. Mobile capture was also visually inspected.

## Findings and comparison history

- Initial P2: generated map lacked the reference's plot outlines. Replaced it with a separately generated, outlined aerial asset. The final desktop and mobile captures show the three outlined sample plots.
- Initial P2: About the data text inherited a light map color against a light button. Added explicit dark foreground; the final screenshot shows readable text.
- Initial P2: unassessed soil could mark a check complete. Changed it to agronomist follow-up; dry soil also requires follow-up. Whitespace-only notes no longer save. Field selection clears unfinished observation inputs.
- Added keyboard dialog containment, Escape closing and focus restoration. No formal screen-reader audit was performed.
- No remaining P0/P1/P2 visual or workflow findings were identified in the tested states.

## Required fidelity surfaces

- Typography: DM Sans preserves the reference's sans-serif hierarchy and strong headings. Inspector/table/activity type is denser than the image; minor P3 tuning remains, especially for large-screen presentations. Text remains readable, and the mobile layout preserves full draft text.
- Layout and spacing: dark fixed sidebar, light workspace, dominant map, right inspector, lower field table and activity match the approved structure. Mobile stacks the map and inspector. No horizontal document overflow at the tested mobile width; desktop controls remain reachable.
- Colors: forest green, ivory, pale green selection and amber review states are preserved. Uniform library icons replace the mock's icon artwork consistently.
- Image quality: a generated aerial asset, edited with field outlines, occupies the intended map region. No CSS or handcrafted SVG image substitutes. The leaf mark is a Phosphor library icon. Labels and selection are real interactive controls. Image and positions are expressly illustrative, not georeferenced. The mock's scale bar was omitted because a metric scale on generated scenery would be misleading.
- Copy: preserves the field/advisory/activity hierarchy. Adds explicit demo status, review requirements and no-message-sent wording. Hausa is a sample translation requiring local-language review.

## Interaction verification

- English/Hausa selection changes the draft. Hausa preview contains the selected Hausa message.
- Saving a demo draft adds an activity entry without sending any external message.
- Dry-soil check with notes updates the selected field to Agronomist follow-up and adds the observation to recent activity.
- Selecting Bello changes the inspector to his maize plot.
- Recorded field checks and advisory saves were also observed in the user-visible session.
- Overview and Fields navigation were observed changing the page context.
- Browser console warning/error query returned an empty list in the isolated test session.
- Production build passed after final source changes.

## Open limitations / follow-up polish

- No live weather, satellites, SMS, production authentication or server persistence. Changes last for the tab session; export downloads a JSON snapshot.
- No independent agronomic or Hausa-language validation.
- Forecast accuracy, real field boundaries, accessibility with assistive technology and a full device matrix are outside this demonstrator.
- P3: refine desktop table/activity typography toward the larger source lettering in a later visual iteration.

## Implementation checklist

- [x] Approved screen implemented with generated map imagery.
- [x] Translation and activity incorporated.
- [x] Core draft and check workflows exercised in the browser.
- [x] Desktop and mobile visual evidence inspected.
- [x] Combined reference/implementation comparisons saved.
- [x] Production build verified.

## Friendly redesign — 13 November 2026
Implemented a map-first layout with no persistent sidebar, metrics grid, sample table or inspector. Secondary tools live in Workspace. Preserved the real Kano imagery and independent sample advisory workflow.
Verified in the in-app browser at desktop and 390×844: real imagery loaded, pin appeared and cleared, Workspace opened and closed, Hausa changed the draft, preview/save updated activity, and Data tools remained accessible. Screenshots: qa/friendly-desktop.png and qa/friendly-mobile.png. Intentional differences from the previous screenshot are the removed dashboard chrome and progressive disclosure. No horizontal clipping observed. Short transitions respect reduced motion. Drawer background scrolling is locked.
Validation: production build passed; all 30 API tests and 4 hosting tests passed. Live weather/catalogue retrieval was not re-tested as part of this visual change.

# Farm-specific observations
The advisory farm selector now includes registered farms separately from fictional samples. Each registered farm stores its own stage, status, observation date, manually recorded temperature and field check locally. Verified changing the test farm to Vegetative with a recorded temperature of 32°C, switching to Zainab's sample (Fruiting), then returning to the registered farm with its values preserved. Screenshot: qa/farm-specific-observations.png. No automatic farm forecast or satellite-derived stress assessment is claimed.

# Farm editing and outlines
Added Edit farm and Draw/Edit land outline for registered farms. Editing details preserves observations and existing boundaries. Outline mode supports adding corners, draggable corner handles, undo, start over, cancel and explicit save; rejects crossed or degenerate outlines. Entered area remains unchanged. Verified editing the pilot test farm area, drawing four corners, dragging a corner, saving, reloading and reopening the saved outline. Boundary validation test and production build pass. Screenshot: qa/farm-boundary-editor.png. Geometry is approximate and saved locally with the farm.

# Farm deletion and recovery
Added Delete farm with a named confirmation. Removed farms are excluded from the workspace and saved map polygons, and retained under Deleted farms for recovery. Restore keeps the farm outline and observations. Verified restoring the pilot test record, confirming deletion, and reloading to confirm the farm remains removed and recoverable. Build passed. Screenshot: qa/delete-farm.png.

# Soil moisture estimates and manual overrides — 13 November 2026
Added Soil & water under registered-farm advice. Open-Meteo hourly model layers (3–9, 9–27, 27–81 cm) are normalised from m³/m³ to % VWC and labelled as grid estimates, not farm sensor readings. Farm reference coordinates come from the outline's average vertex location, otherwise its saved pin. The explicit load button discloses transmission to Open-Meteo.

Manual records support visual condition or calibrated sensor % VWC, depth, WAT observation time, soil type and irrigation water availability. Both model and manual records remain saved locally. Users select recent-manual-first, manual-only or model-only; data older than 24 hours is excluded from active guidance by a stated pilot freshness rule. Changed farm coordinates invalidate the previous model for advice. Guidance does not classify numerical VWC with universal dry/wet thresholds or prescribe an irrigation dose. English guidance can be copied into the editable advisory draft for review; it is not automatically translated or sent.

Verified in the browser: live model request succeeded for the synthetic pilot test farm; visual reading saved; sensor reading saved at 15 cm; manual/model preference switching kept both records; both persisted after reload; guidance filled the selected farm's English draft. Test record returned to Deleted farms afterward. Screenshot: qa/soil-moisture.png. Five targeted tests cover zero/missing values, unit errors, future hours, freshness, overrides and location changes.

Provider documentation: https://open-meteo.com/en/docs . Irrigation context: https://www.fao.org/4/x0490e/x0490e0e.htm . The current soil panel provides general soil/water checks; it does not yet combine farm-specific weather, crop coefficients and measured root-zone water balance into an irrigation schedule.

# Planting planner
Registered-farm advice now includes What should I plant? Farmers enter a preferred crop, planting date, soil type, drainage, seasonal water supply and confirmation of established seasonal rains. Compares five pilot profiles: millet, sorghum, maize, groundnut and tomato. Uses transparent qualitative rules, sourced to FAO, ICRISAT and IITA. Limited irrigation prioritises investigating millet/sorghum; no water, poor drainage, recent waterlogging or unconfirmed rainfed establishment produce a check-first result. Unknown inputs withhold a confident shortlist. Unknown preferred crops remain explicitly unsupported.

Optional Open-Meteo local seven-day weather is saved with timestamp and reference coordinates. Only fresh, location-matched forecast days covering the planting date contribute an establishment-rain check; they do not establish seasonal suitability. Crop selection does not overwrite the current crop record. Nutrients, pH, salinity, varieties, rotation, pests, full-season climate and market prices are explicitly unassessed. No yield, profit or numerical suitability score is claimed.

Browser verified maize with limited irrigation suggests investigating millet/sorghum, and unavailable water changes all crops to Wait / resolve conditions. Tests cover missing inputs, waterlogging, clay/groundnut, unknown crops, future planting and stale/moved forecasts.

# Registration overlay and boundary area fixes
Reproduced the map-to-registration bug: the pin card remained mounted behind the modal. Registration now captures the selected coordinates separately, closes the pin card and marker, and closes the workspace drawer. Cancelling registration does not reopen the old card. Browser verified zero remaining pin cards with the selected-pin checkbox still present.

Saving an outline now calculates spherical polygon area in hectares and updates the farm's stored size alongside its boundary. The drawing panel displays live area; invalid outlines cannot update area. Original entered size is retained as enteredAreaHa, observations are preserved, and outline-derived size is read-only in farm detail editing. Browser test: dragging a corner changed 3.8503 ha to 4.715 ha; saving updated the farm card to 4.715 ha. This remains an approximate map measurement, not a survey.

# Pin-only registration save fix
Reproduced with farm name and crop, a selected pin, an area of 1.234 ha and no typed location: native form validation blocked both the required location and the area's old 0.01 step. Location is now optional when Use selected map pin is checked, and decimal area input accepts arbitrary precision. Registration validation uses the captured pin and a Pinned location, Kano display label without a geocoding request. Unticking the pin restores required location input. Browser verified the formerly failing form saves and the resulting record contains the pin and 1.234 ha. Test record soft-deleted afterward. Three regression tests cover selected/unchecked pins and positive precise area. Screenshot: qa/pin-only-registration-fix.png.

