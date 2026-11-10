# Salah Tracker — Agent Work Orders

You are the build agent for the Salah Tracker MVP. These orders tell you what to build, in what order, what you may decide alone, and when to stop. Follow them literally.

---

## 1. Mission

Build the Android-first MVP described in `docs/DEV-SPEC.md`: a prayer tracker whose one loop is **a prayer window closes, the app asks "did you pray?", a miss becomes a dated qaza, the user settles it later.** Everything is local on the device. No server, no accounts, no analytics.

## 2. Read first, in this order

1. `docs/DEV-SPEC.md` is the source of truth. Read all of it.
2. `docs/DESIGN.md`, `packages/mobile/src/theme/tokens.ts`, `tokens.css` for every visual decision.
3. `docs/salah-counter-sdd.md` for background only. Where it disagrees with the dev spec, the dev spec wins (spec section 2 lists every difference).

If two documents conflict and the spec does not say which wins, stop and ask (section 7).

## 3. Standing rules

These apply to every work order.

1. TypeScript strict. No `any` unless commented with a reason.
2. `packages/core` imports nothing from `react`, `react-native` or `expo-*`. Time and ids are injected. Enforce with a lint rule.
3. Prayer status changes happen only inside `PrayerService`, in one transaction that updates the entry and appends the event (BR-007). No other code writes to `prayer_log` or `prayer_event`.
4. Never delete history rows except in "Delete all data".
5. No network calls in the release build. No analytics, crash or ad SDKs. Do not add libraries outside the spec's list without asking.
6. Colors, spacing, radius, type sizes come only from `tokens.ts`. Do not invent values.
7. Every user-visible string goes through `t(key)` and lives in `en.json`.
8. Status is always icon + label + color. Every touch target is at least 44 × 44 px.
9. Pin `adhan` at 4.4.6 and pin the Expo SDK. Commit the lockfile.
10. Use the defaults in spec section 15 for every open decision. Record each one you rely on in `docs/DECISIONS.md` with the date. Never silently change the spec. If you believe the spec is wrong, write a proposal in `docs/DECISIONS.md` under "Proposed changes" and continue with the spec's version.
11. Write the test before or with the code it covers. A work order is not finished with a red or skipped test.
12. Commit small. Message format: `WO-05: add notification planner (T13)`. One work order per branch, `wo-05-planner`, merged only when its checks pass.
13. Never commit secrets, signing keys or personal data. Never invent store identifiers (see section 4).
14. Never claim something works on a real device unless a human gave you the evidence. Write "implemented, not device-verified."

## 4. What you do and what a human does

**You do:** all code, unit and contract tests, fixtures, the spike harness screen, documentation, store listing text drafts, a privacy policy draft.

**A human must do (do not attempt, do not fake):**

| Task | When needed |
|---|---|
| Run spike S1 and the 24-hour soak on real phones (Pixel, Samsung, Xiaomi/Redmi) | Gate G1 and G4 |
| Compare Dhaka prayer times with an official timetable and confirm the default method (O-1) | Before G4 |
| Choose Android application id and iOS bundle id (O-5) | Before the first EAS build |
| Choose the Google Play developer account type (O-6) | Before M6 |
| App icon and splash artwork | Before G4 |
| Native review of Bengali strings | Only when Bengali work starts (later) |
| Create store accounts, host the privacy policy URL, submit builds | M6 |

Until the application id exists, use the placeholder `com.example.salahtracker` and mark it `TODO(O-5)` in `app.json`.

## 5. Work orders

Run them in order. Each lists its goal, what to do, and the check that proves it is done. "Spec §" points to `DEV-SPEC.md`.

### WO-00 Repository bootstrap
**Goal:** an empty but green monorepo.
**Do:** pnpm workspace with `packages/core` and `packages/mobile`. Copy the three docs into `docs/`. Add `docs/DECISIONS.md` and `STATUS.md`. Configure TypeScript strict, ESLint (with the core purity rule), Jest, and scripts: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Add CI that runs all three. Create the Expo app with Expo Router in `packages/mobile` and a development-build config.
**Check:** `pnpm typecheck && pnpm lint && pnpm test` passes on a clean clone. CI is green.

### WO-01 Core foundations
**Goal:** constants, models, dates, geo.
**Do:** `constants.ts` (spec §5.1), `models.ts` (spec §4.1), `dates.ts` (`toLocalDate`, `addDays`, `startOfLocalDay`, `formatDateWithDay` returning "3 August, Monday", `formatTime` returning "4:32 PM"), `geo.ts` (haversine), `Clock` and `FakeClock`.
**Check:** unit tests for each helper, including month ends, leap day, and the exact "day, month, weekday" string.

### WO-02 Prayer times and windows
**Goal:** `computeDayTimes` and `getWindows` with validation.
**Do:** spec §5.2. Wrap `adhan` with `HighLatitudeRule.recommended`. Throw `PrayerTimeError` on invalid or non-increasing times. Add the golden fixtures as a test table.
**Check:** the three Dhaka fixtures match to the minute. Oslo and London on 21 June are valid. Tromsø (69.6492, 18.9553) on 21 June and 21 December throws. Isha's window ends at the next day's Fajr. Test T12.

### WO-03 Repository, service, state machine
**Goal:** the single writer.
**Do:** `repository.ts` interface (spec §5.3), `InMemoryRepository`, and `PrayerService` with `ensureDay`, `answer`, `setStatus`, `settle` (spec §5.4). Implement the full transition table from spec §4.3 and BR-001 to BR-009. Typed errors: `InvalidTransitionError`, `NotStartedError`.
**Check:** a test for every valid and every invalid transition. Tests T1, T2, T3. BR-003 rejects answering a future window. Calling `answer` twice changes nothing.

### WO-04 Reconcile, queries, streaks
**Goal:** auto-qaza, catch-up, derived data.
**Do:** `reconcile.ts` (spec §5.5), `queries.ts` (qaza counts, oldest qaza, recovered-this-week, streaks per spec §4.5), `rewriteOpenWindows` (BR-006), `addQazaRange` (spec §5.4).
**Check:** tests T4, T5, T6, T7, T8, T9, T11. Reconcile run twice creates nothing the second time.

### WO-05 Planner and backup shape
**Goal:** pure notification plan and backup validation.
**Do:** `planner.ts` with `planNotifications` and `diffPlan` (spec §5.6). `backup.ts` with export shape and strict import validation (spec §4.6).
**Check:** tests T10 (using the in-memory repo) and T13. The iOS plan has at most 36 items. Answered keys are skipped. Isha items are marked quiet.

> **Gate G2 (agent self-check, then continue):** all of `packages/core` is green, coverage on `prayerService`, `reconcile`, `queries` and `planner` is at least 90%. Write the results into `STATUS.md`.

### WO-06 SQLite repository and migrations
**Goal:** the real storage.
**Do:** `SqliteRepository` over `expo-sqlite` implementing the same interface, with real transactions. Migration runner on `PRAGMA user_version` (spec §4.2). Run the shared contract suite against both repositories.
**Check:** the contract suite passes for both. Bulk insert of 36,525 rows completes in a single transaction; record the time on the best test environment you have and note that the real number must come from the reference phone.

### WO-07 Theme, components, i18n, shell
**Goal:** the app frame.
**Do:** `useTheme` (system, light, dark) from `tokens.ts`. Build the components in DESIGN.md §7 that the MVP needs: Button variants, HeroCard (today and recovery), PrayerStrip, StatusPill, QazaRow, DateRow, CalendarMonth, DayPrayerRow, Toggle, Segmented, Banner, EmptyState, StreakBadge, Note, plus a **BottomSheet** and a **Snackbar with Undo** (both new, add them to DESIGN.md §7 when done). Icon set per DESIGN.md §10 with `react-native-svg`. `t(key)` with `en.json` and a `bn.json` stub. Expo Router tabs: Today, Recovery, Journey, Settings, and the onboarding stack.
**Check:** a component gallery screen (dev only) renders every component in light and dark. Snapshot or render tests for status mapping through `statusStyle`. Lint rule or test that no hex colors appear outside `tokens.ts`.

### WO-08 Onboarding, location, cities
**Goal:** a new user reaches a working Today.
**Do:** spec §7.1. Auto-detect (coarse, foreground only), city search from bundled `cities.json`, coordinate entry, method picker (11 methods), madhab picker, live preview of today's five times, the latitude error. Defaults per O-1. Location recheck on foreground (once per 6 hours, 1 km threshold, spec §5.1).
**Data note:** `cities.json` comes from GeoNames (CC BY 4.0): all Bangladesh district headquarters and major towns, plus world cities above 100,000 people. If you cannot download it, stop and ask a human to place the file. Do not type coordinates from memory.
**Check:** story M-01 passes in tests with a mocked location module. The city picker works with the network disabled.

### WO-09 Today
**Goal:** the main screen.
**Do:** spec §7.2 and story M-03, including hero states A and B, yesterday's Isha after midnight, "Needs your answer" cards, the strip, the reminders-off banner, minute-aligned countdown.
**Check:** render tests for each scenario in M-03 using `FakeClock`. Marking prayed writes one event and shows the undo snackbar.

### WO-10 Notifications (gated by S1)
**Goal:** reliable check-ins.
**Step 1, spike harness:** build the throwaway S1 screen from spec §6.8 and a one-page test protocol in `docs/S1-PROTOCOL.md` (devices, steps, a table to fill in). Then **stop at Gate G1** and tell the human to run it. Do not build the rest of WO-10 on assumptions.
**Gate G1 (human):** S1 results are recorded in `docs/S1-RESULTS.md`. If criterion 2 failed, the human picks the fallback from spec §6.8.
**Step 2, after G1:** the notification adapter, channels (`checkin`, `checkin-quiet`), category `PRAYER_CHECKIN`, the schedule rebuild flow (spec §6.3), response handling with cold-start recovery and the idempotence key (spec §6.4), cancel and dismiss on in-app answers, permission flow, and the Reminder health screen with the test reminder (spec §6.6).
**Check:** stories M-04, M-05, M-10 in tests with a fake notification adapter. Responses delivered twice change nothing. The plan, the OS list and the log agree after every rebuild.

> **Gate G3 (human):** the human installs the dev build on three phones and confirms M-04 and M-10 in `STATUS.md`. Until then, mark these stories "implemented, not device-verified."

### WO-11 Recovery and Journey
**Goal:** the ledger.
**Do:** spec §7.3 and §7.4: Recovery hero, per-prayer rows, Qaza dates list with Settle, empty state; Journey streak tiles, calendar with the dot rules, month jump, day detail with the bottom sheet of valid transitions, "auto" marker, and range add with preview, progress and result toast.
**Check:** stories M-06, M-07, M-08, M-09, M-13. A range add of 7,305 days × 5 prayers shows progress and never blocks the UI thread for more than 100 ms at a time (chunk it).

### WO-12 Settings, backup, pilot report
**Goal:** control and safety.
**Do:** spec §7.5, stories M-11, M-12, M-14. Changing location, method or madhab runs `rewriteOpenWindows` then rebuilds notifications. Export through the share sheet, import with whole-file validation and a confirm sheet showing counts. Delete all data. The 50th-entry backup nudge. Pilot report that shows the exact JSON before sharing. About screen with the GeoNames attribution.
**Check:** export then import on a fresh database gives identical rows. A corrupt file leaves existing data unchanged.

### WO-13 Hardening and release prep
**Goal:** ready for the human soak test and the store.
**Do:** accessibility pass against DESIGN.md §9 (labels like "Fajr, qaza", focus order, 130% font scale, reduced motion). Performance measurements per spec §9. Remove dead code. Write drafts: `docs/privacy-policy.md` matching spec §10.2, store listing text, permission explanations, and `docs/RELEASE-CHECKLIST.md` copied from spec §13 with owners.
**Check:** story M-15. `STATUS.md` lists every measurement and marks which ones still need the reference phone.

> **Gate G4 (human):** the 24-hour soak table, the official timetable comparison, the application ids, the icon and a review of the English strings are done. Only then build a release candidate.

## 6. Reporting

Update `STATUS.md` after every work order. Keep it short:

```
## WO-05 Planner and backup shape — done
Branch: wo-05-planner · Tests: 41 passing, 0 skipped · Coverage planner 96%
Decisions used: O-2 (180 min), O-3 (Isha quiet)
Not device-verified: none
Open questions: none
Next: WO-06
```

Rules: list failing or skipped tests honestly. Never mark a work order done with a known failing check. Put anything that needs a human at the top of `STATUS.md` under "Waiting on a human".

## 7. Stop and ask a human when

- the spec and DESIGN.md contradict each other and the spec does not say which wins,
- a gate (G1, G3, G4) is reached,
- a required input is missing: `cities.json`, application ids, any account or key,
- a check keeps failing after two honest attempts and the cause may be the spec,
- the change you want would alter a rule in spec §4.4 (BR-001 to BR-009), the transition table, or the notification copy,
- you need a library outside the spec's list,
- a platform limit blocks a stated requirement (for example notification actions not working with the app closed).

Ask once, with the question, the options you see, and your default. Then continue with other work orders that do not depend on the answer.

## 8. Global definition of done

- All stories M-01 to M-15 are implemented and their automated checks pass.
- `pnpm typecheck && pnpm lint && pnpm test` is green, no skipped tests.
- The golden fixtures, T1 to T13 and the contract suite pass.
- No hex color outside `tokens.ts`. No string outside `en.json`. No network call in the release build. No core import of React, React Native or Expo.
- `STATUS.md` is current and every device-dependent claim says whether a human verified it.
- `docs/DECISIONS.md` lists every default used and every proposed spec change.

## 9. Kickoff message

Paste this to start the agent:

> Read `AGENT-ORDERS.md`, then `docs/DEV-SPEC.md` and `docs/DESIGN.md`. Execute WO-00 now, then continue in order. Update `STATUS.md` after each work order. Use the defaults in spec section 15 and record them in `docs/DECISIONS.md`. Stop at Gate G1 after building the S1 spike harness. Do not claim device verification without evidence from a human.
