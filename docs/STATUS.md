# Status

## Waiting on a human

- **Gate G1 (after WO-10 step 1):** run spike S1 on a Pixel, a Samsung and a Xiaomi/Redmi per `docs/S1-PROTOCOL.md` (battery saver on, screen off 3 h, reboot check) and record results in `docs/S1-RESULTS.md`. If criterion 2 fails, pick the fallback from spec §6.8. Until G1 passes, WO-10 step 2, WO-11, WO-12, WO-13 are not built.
- **Gate G1 note:** the S1 harness schedules notifications but cannot prove tap-to-write until WO-10 step 2 lands; criterion 2 is counted by opening the app after each tap (see protocol).

## WO-00 Repository bootstrap — done
Branch: main (per-WO branches collapsed: core and mobile were built by parallel subagents in one working tree; commits below are grouped per work order instead) · Tests: green at commit time · Coverage: n/a
Decisions used: O-5 (placeholder app id `com.example.salahtracker`)
Not device-verified: everything — no real device in this environment
Open questions: none
Next: WO-01

## WO-01 Core foundations — done
Branch: main · Tests: part of core suite, 145 passing, 0 skipped · Coverage: dates 100%, geo 100%
Decisions used: none
Not device-verified: n/a (pure logic)
Open questions: none
Next: WO-02

## WO-02 Prayer times and windows — done
Branch: main · Tests: golden fixtures pass to the minute (all 3 Dhaka rows incl. UTC row); Oslo/London 21 June valid; Tromsø 21 June and 21 Dec throw PrayerTimeError; Isha window ends at next day's Fajr
Decisions used: O-1 (Karachi/Hanafi default for BD/IN/PK)
Not device-verified: n/a (pure logic; Dhaka times are library fixtures, not an official-timetable comparison — that check is still owed before G4)
Open questions: none
Next: WO-03

## WO-03 Repository, service, state machine — done
Branch: main · Tests: every valid and invalid transition tested; T1, T2, T3 pass; answer twice changes nothing
Decisions used: none
Not device-verified: n/a (pure logic)
Open questions: BR-003 is enforced in `setStatus` only for pending → on_time and no-row entries, not for pending → qaza (UI disables those rows); see core agent note in handoff
Next: WO-04

## WO-04 Reconcile, queries, streaks — done
Branch: main · Tests: T4, T5, T6, T7, T8, T9, T11 pass; reconcile run twice creates nothing the second time
Decisions used: O-2 (180 min), O-4 (3-day catch-up)
Not device-verified: n/a (pure logic)
Open questions: T5 wording — spec §5.5 formula materialises 4 dates, not 3; recorded in DECISIONS.md under Proposed changes
Next: WO-05

## WO-05 Planner and backup shape — done
Branch: main · Tests: T10, T13 pass · Coverage planner 100%
Decisions used: O-2 (180 min), O-3 (Isha quiet)
Not device-verified: none
Open questions: iOS plan reaches 37 items between midnight and Fajr vs spec §6.3 cap of 36; recorded in DECISIONS.md under Proposed changes
Next: WO-06

## Gate G2 (agent self-check) — passed 2026-11-10
`pnpm typecheck && pnpm lint && pnpm test` green. Coverage (lines): prayerService 99.44%, reconcile 96.42%, queries 100%, planner 100% — all ≥90%. Global core coverage 98.86% lines.

## WO-06 SQLite repository and migrations — done
Branch: main · Tests: contract suite passes identically for InMemoryRepository and SqliteRepository; migration-from-empty passes · Bulk insert 36,525 rows in one transaction: 3,941 ms on this VM (node:sqlite, in-memory) — the real number must come from the reference phone
Decisions used: none
Not device-verified: SQLite on a real device (contract suite ran under node:sqlite, same SQL/driver interface as the expo-sqlite adapter)
Open questions: none
Next: WO-07

## WO-07 Theme, components, i18n, shell — done
Branch: main · Tests: 67 mobile tests passing, 0 skipped (incl. statusStyle mapping, hex-literal scan, i18n key parity) · `expo export --platform android` passes (3.6 MB entry)
Decisions used: none
Not device-verified: rendering/theme on a real device (gallery is dev-only; hero "gradient" is a solid fill — expo-linear-gradient is outside the spec §3.1 library list, so no gradient until approved)
Open questions: none
Next: WO-08

## WO-08 Onboarding, location, cities — done
Branch: main · Tests: M-01 passes with mocked location; city picker works with network disabled
Decisions used: O-1 (Karachi/Hanafi in BD/IN/PK else MWL/Shafi)
Not device-verified: onboarding on a real phone; location permission flow on-device
Open questions: none — cities.json is REAL (GeoNames cities1000.zip, 6,380 entries, 149 BD, 792 KB; larger than the spec's ~250 KB estimate)
Next: WO-09

## WO-09 Today — done
Branch: main · Tests: M-03 render scenarios pass with FakeClock; marking prayed writes one event and shows the undo snackbar
Decisions used: O-7 (no confirm on Not prayed)
Not device-verified: Today/hero behaviour on a real device; minute-aligned countdown on-device
Open questions: none
Next: WO-10 step 1

## WO-10 step 1 S1 spike harness — done, STOPPED at Gate G1
Branch: main · Tests: harness screen exists at `app/dev/s1.tsx`; `docs/S1-PROTOCOL.md` written (Pixel/Samsung/Xiaomi, steps, fill-in table for the 3 §6.8 criteria)
Decisions used: O-3 (Isha quiet)
Not device-verified: ALL of S1 — no real device here; this is exactly what Gate G1 is for
Open questions: Gate G1 human run outstanding (see top of file)
Next: Gate G1 (human), then WO-10 step 2 only after G1

## Not in scope for this stop
WO-10 step 2, WO-11, WO-12, WO-13 — not built. Recovery/Journey/Settings tabs are intentional shells for WO-11/12. "Delete all data" (WO-12) is not built.
