# Decisions

Spec §15 defaults relied on, with dates. See AGENT-ORDERS §3 rule 10.

| # | Decision | Default used | Date |
|---|---|---|---|
| O-1 | Default method/madhab | Karachi/Hanafi when location is in Bangladesh, India or Pakistan, otherwise MuslimWorldLeague/Shafi. Always changeable. | 2026-11-10 |
| O-2 | Auto-qaza grace | 180 minutes after window end | 2026-11-10 |
| O-3 | Isha check-in | At the next Fajr, quiet (no sound/vibration) | 2026-11-10 |
| O-4 | Catch-up cap | 3 days | 2026-11-10 |
| O-5 | Application id / bundle id | Placeholder `com.example.salahtracker` in `app.json` — marked TODO(O-5); real ids must be chosen before the first EAS build | 2026-11-10 |
| O-7 | "Not prayed" confirm | No confirm tap. Undo covers it. | 2026-11-10 |
| O-8 | Range add maximum | 20 years (7,305 days) per operation | 2026-11-10 |

## Proposed changes

1. **Planner iOS cap, 2026-11-10 (verified by coordinator):** spec §6.3 says the iOS plan has "36 notifications including the sentinel", and §5.6 plans dates yesterday..today+horizon−1. Between midnight and Fajr that yields 36 check-ins (yesterday's Isha + 7 full days) + 1 sentinel = **37 items** (verified: plan at 00:30 = 37, at 14:00 = 35). Proposed: either cap the plan at 36 by dropping the oldest item when over, or restate the cap as 37. Continuing with the spec's version (no cap applied); T13 only asserts ≤36 at 14:00.
2. **Reconcile catch-up wording, 2026-11-10:** spec §5.5's formula `start = max(tracking_started_at, today − 3 days)` .. today materialises **4 dates** (20 rows), while T5 says "only the last 3 days". The implementation follows the formula literally. Proposed: clarify whether the catch-up window is 3 or 4 dates. Continuing with the spec's version.
