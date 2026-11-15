# Farm activity

Private journal with up to four re-encoded JPEG photos per entry. Tasks include WAT dates, priorities, completion, archive/restore and in-app reminders. Weather rules use fresh forecasts and create deduplicated field-check tasks. No email, SMS, push delivery or official emergency warning service.

The hosted supabase/farm-activity.sql migration is applied. tests/farm-activity-access.sql passed in a rolled-back transaction: owner isolation, admin denial, photo path isolation, completion timestamps, revisions, duplicate alerts, archive/restore and deleted-farm guards. No fixtures remain.

Photo uploads and record inserts cannot share a transaction. Insertion failure attempts cleanup and reports any cleanup failure. Browser interaction and image re-encoding require manual verification; no browser runtime was available.
