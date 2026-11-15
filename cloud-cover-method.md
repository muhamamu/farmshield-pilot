# Cloud-cover outlook

The requested history-based estimate is a deliberately simple, unvalidated baseline.
For the selected location, FarmShield asks NASA POWER for CLOUD_AMT daily percentages
in the previous 21 complete UTC dates, using a rounded regional point and six-hour
server caching. Invalid dates, future dates, fill values, strings and values outside
0–100 are excluded. At least five valid days within the latest seven-calendar-day
window are required; the latest record must be no more than seven days old.

The mean gives weights 7 to the most recent date, 6 to the day before, down to 1.
That same average is carried forward for the next three dates. The UI calls it an
experimental recent-average estimate, displays source dates and age, and states that
predictive accuracy is unvalidated. Observed minimum/maximum is historical variation,
not a prediction interval or calibrated probability. Cloud cover is not rain probability.

When history is absent, stale or insufficient, no history-based percentages are
invented. MET Norway daily cloud cover may be displayed instead, explicitly labelled
Weather model. It uses duration-weighted cloud_area_fraction samples over complete
UTC days (01:00–01:00 WAT); gaps or invalid units leave values unavailable.

The NASA live check on 15 November 2026 returned fill values for the recent dates at
the tested point. Consequently, the fallback is a material part of this feature.
The public source is regional gridded data, not an observation over a specific farm.
The app sends regional coordinates through its backend and never uses whole-scene
Sentinel cloud percentages as local weather history. Tests use isolated fixtures.

Sources checked:
- https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- https://power.larc.nasa.gov/docs/faqs/data/
- https://docs.api.met.no/doc/locationforecast/datamodel.html

Browser interaction verification is unavailable in this session. Build and regression
checks run on Vercel before deployment; live API responses are checked separately.
