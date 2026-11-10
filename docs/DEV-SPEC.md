# Salah Tracker — MVP Development Spec

Version 1.0 · Android first, iOS after milestone M5 · Audience: the developer or coding agent who builds the app.

---

## 0. How to use this document

- **Precedence.** This spec overrides `salah-counter-sdd.md` for the MVP. Every difference is listed in section 2. UI follows `DESIGN.md`, `tokens.css` and `tokens.ts` exactly.
- **Language.** MUST and MUST NOT are requirements. SHOULD is a default that needs a reason to break.
- **Done means** every acceptance criterion of a story passes on a real device, not an emulator, and unit tests for its core logic pass.
- **Unknowns** are marked as spikes (section 6.8) or open decisions (section 15). Do not guess them silently.

---

## 1. Goal and scope

### 1.1 Impact thesis

One loop: **a prayer window closes, the app asks, a miss becomes a dated qaza, the user settles it later.** Most prayer apps only remind. This app keeps an honest, correctable ledger of what was missed and what was made up. The MVP builds this loop and the minimum around it, and nothing else.

### 1.2 Success metrics (2-week pilot, 5 to 10 real users)

| Metric | Target |
|---|---|
| Prayers answered per day (prayed, not prayed, or marked in app) | at least 4 of 5, on at least 70% of days |
| Qaza settled per user per week | at least 1 |
| Check-in notification delivered within ±2 minutes of window end | at least 95% across the device matrix |
| Answers lost (tapped in a notification but not stored) | 0 |

Metrics come from the opt-in pilot report (story M-14). There is no analytics SDK.

### 1.3 In and out

| Feature | MVP | Later |
|---|---|---|
| Onboarding: location, method, madhab, notification permission | Yes | |
| Prayer times, offline, from the `adhan` library | Yes | Aladhan API cross-check |
| Today screen | Yes | |
| Check-in notification at window end with Prayed / Not prayed | Yes | |
| Qaza ledger and Recovery screen | Yes | |
| Journey: calendar, day detail, edit status, add back-dated qaza | Yes | Heatmap, milestones |
| Add qaza for a date range (back-dated backlog) | Yes | |
| Streaks | Yes | |
| Dark mode | Yes | |
| Manual backup export and import | Yes | |
| Reminder health screen and test notification | Yes | |
| Opt-in pilot report | Yes | |
| English UI with i18n scaffolding | Yes | Bengali UI |
| Google Drive sync | | Yes |
| PWA / web | | Yes |
| Insights tab | | Yes |
| Home screen widget | | Yes |
| Dua cards | | Yes |
| "Closing soon" pre-end reminder, recovery nudges, daily summary | | Yes |

---

## 2. Changes from the SDD

| # | SDD | MVP | Reason |
|---|---|---|---|
| 1 | One JSON blob in AsyncStorage | **SQLite** (`expo-sqlite`) with real transactions. JSON only for backup files | Bulk back-dated qaza (years × 5 per year) is too large for one blob, and write-both needs a true transaction |
| 2 | Cache, then `adhan`, then Aladhan API | **`adhan` only, no network.** `PrayerTimeCache` table removed. Window times are stored on each log entry | Offline, one source, no drift |
| 3 | Windows not defined | Defined in section 5.2 | Needed by notifications and auto-qaza |
| 4 | Unanswered becomes qaza "by next prayer's start" | **180 minutes after window end** | For 4 of 5 prayers the next start equals the window end, so the SDD rule means zero grace |
| 5 | Catch-up marks every missing day as qaza | **Catch-up is limited to the last 3 days** | A long absence must not inflate the qaza count with guesses |
| 6 | Notification taps are `source: auto` | `manual` = the user decided (any tap). `auto` = the app decided (auto-qaza, catch-up) | The UI shows "auto-logged, tap to correct" only for app decisions |
| 7 | `PrayerEvent` has type only | Adds `from_status` and `to_status` | Audit and undo |
| 8 | Four tabs including Insights | Tabs: **Today, Recovery, Journey, Settings** | Insights is cut |
| 9 | Google sign-in and Drive sync | None. No OAuth verification needed | Cut for MVP. Backup is manual file plus OS backup |
| 10 | Window-closing reminder | The check-in fires **at the end** of the window, as the product owner specified. The mockup wording "closes in 27 minutes" is replaced (section 6.2) | Matches the original requirement |
| 11 | Not present | Added: range add, undo snackbar, reminder health, backup, pilot report | See section 8 |
| 12 | Not present | Polar latitudes are rejected with a clear message | The library returns invalid times there (section 5.2) |

---

## 3. Stack and repository

### 3.1 Stack

- **Expo (React Native) with TypeScript strict**, Expo Router. Use the latest stable Expo SDK at project start and pin it.
- **Development builds (EAS), not Expo Go,** for all notification work.
- Libraries: `adhan` (pin 4.4.6, verified for this spec), `expo-sqlite`, `expo-notifications`, `expo-location`, `expo-intent-launcher` (Android settings links), `expo-crypto` (UUID), `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-font` (Inter only), `react-native-svg`, `@react-native-community/datetimepicker`, `zustand`.
- Tests: `jest`, `@testing-library/react-native`.
- Not used: moment, date-fns-tz, Redux, any ORM, any analytics or crash SDK.

### 3.2 Layout

```
salah-tracker/
├── docs/                     DEV-SPEC.md, DESIGN.md, salah-counter-sdd.md
├── packages/
│   ├── core/                 pure TypeScript, no react / react-native / expo imports
│   │   └── src/
│   │       ├── constants.ts
│   │       ├── models.ts
│   │       ├── dates.ts          local dates, formatting
│   │       ├── prayerTimes.ts    adhan wrapper, validation
│   │       ├── windows.ts
│   │       ├── repository.ts     interface only
│   │       ├── prayerService.ts  the only writer (BR-007)
│   │       ├── reconcile.ts
│   │       ├── queries.ts        qaza counts, oldest qaza, streaks
│   │       ├── planner.ts        notification plan, pure
│   │       ├── backup.ts         export / import shape and validation
│   │       ├── geo.ts            haversine
│   │       └── testing/          InMemoryRepository, FakeClock
│   └── mobile/
│       ├── app/                  Expo Router routes
│       └── src/
│           ├── theme/            tokens.ts, useTheme
│           ├── components/       from DESIGN.md section 7
│           ├── data/             SqliteRepository, migrations, cities.json
│           ├── notifications/    adapter, handlers, channels
│           ├── location/
│           ├── i18n/             en.json, t()
│           └── state/            zustand stores
└── pnpm-workspace.yaml
```

Rule: `core` MUST NOT import anything from `react`, `react-native` or `expo-*`. Time and ids are injected (`Clock`, `newId`) so core is fully testable.

---

## 4. Data

### 4.1 Types

```ts
export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PrayerStatus = "pending" | "on_time" | "qaza" | "settled";
export type Source = "auto" | "manual";
export type EventType = "MARKED_ON_TIME" | "AUTO_QAZA" | "MARKED_QAZA" | "SETTLED" | "CORRECTED";
export type LocalDate = string; // "YYYY-MM-DD" in the device time zone
export type IsoUtc = string;    // "2026-11-10T05:43:00.000Z"

export interface PrayerLogEntry {
  id: string;                    // UUID
  prayer_date: LocalDate;        // local date of the window START (Isha after midnight keeps the previous date)
  prayer: PrayerName;
  status: PrayerStatus;
  source: Source;
  window_start: IsoUtc | null;   // null for back-dated entries
  window_end: IsoUtc | null;
  timezone: string;              // IANA
  latitude: number | null;
  longitude: number | null;
  calculation_method: CalculationMethodName;
  madhab: "hanafi" | "shafi";
  created_at: IsoUtc;
  updated_at: IsoUtc;
}

export interface PrayerEvent {
  id: string;
  prayer_log_id: string;
  type: EventType;
  from_status: PrayerStatus | null;
  to_status: PrayerStatus;
  created_at: IsoUtc;
}

export type CalculationMethodName =
  | "MuslimWorldLeague" | "Egyptian" | "Karachi" | "UmmAlQura" | "Dubai"
  | "MoonsightingCommittee" | "NorthAmerica" | "Kuwait" | "Qatar" | "Singapore" | "Tehran" | "Turkey";
```

`Other` from the library is not offered.

### 4.2 SQLite schema (migration 1)

Schema version is stored in `PRAGMA user_version`. Migrations are an ordered array of functions run in one transaction on app start, before any read or write.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE prayer_log (
  id TEXT PRIMARY KEY,
  prayer_date TEXT NOT NULL,
  prayer TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha')),
  status TEXT NOT NULL CHECK (status IN ('pending','on_time','qaza','settled')),
  source TEXT NOT NULL CHECK (source IN ('auto','manual')),
  window_start TEXT,
  window_end TEXT,
  timezone TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  calculation_method TEXT NOT NULL,
  madhab TEXT NOT NULL CHECK (madhab IN ('hanafi','shafi')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (prayer_date, prayer)                       -- BR-001
);
CREATE INDEX idx_log_status ON prayer_log (status, prayer, prayer_date);
CREATE INDEX idx_log_date   ON prayer_log (prayer_date);

CREATE TABLE prayer_event (
  id TEXT PRIMARY KEY,
  prayer_log_id TEXT NOT NULL REFERENCES prayer_log(id),
  type TEXT NOT NULL CHECK (type IN ('MARKED_ON_TIME','AUTO_QAZA','MARKED_QAZA','SETTLED','CORRECTED')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_event_log  ON prayer_event (prayer_log_id, created_at);
CREATE INDEX idx_event_type ON prayer_event (type, created_at);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                               -- JSON
  updated_at TEXT NOT NULL
);
```

Settings keys: `location` `{lat, lng, label, mode: "auto"|"manual"}`, `method`, `madhab`, `notifications_enabled`, `theme` (`system|light|dark`), `onboarding_done`, `tracking_started_at` (IsoUtc), `last_location_check_at`, `last_handled_response` (string).

Rows in `prayer_log` and `prayer_event` are never deleted except by "Delete all data" (BR-002).

### 4.3 State machine

| From | To | Event type | Notes |
|---|---|---|---|
| (no row) | on_time | MARKED_ON_TIME | Back-dated entry, `source: manual` |
| (no row) | qaza | MARKED_QAZA | Back-dated entry, `source: manual` |
| pending | on_time | MARKED_ON_TIME | Window must have started (BR-003) |
| pending | qaza | MARKED_QAZA | User tapped Not prayed |
| pending | qaza | AUTO_QAZA | `source: auto`, from reconcile only |
| qaza | settled | SETTLED | The only way to settle (BR-004) |
| on_time | qaza | CORRECTED | User edit in day detail |
| qaza | on_time | CORRECTED | User edit in day detail |
| settled | qaza | CORRECTED | Undo settle |
| any | previous status | CORRECTED | Undo snackbar, within 5 seconds, may restore `pending` |

Everything else is rejected with a typed error (`InvalidTransitionError`). `pending` is never a target except through undo.

### 4.4 Business rules

| ID | Rule |
|---|---|
| BR-001 | One `PrayerLogEntry` per prayer per date (UNIQUE constraint). |
| BR-002 | History is never deleted, except by the explicit "Delete all data" action. |
| BR-003 | A prayer whose `window_start` is in the future cannot be answered. |
| BR-004 | Only `qaza` can become `settled`. |
| BR-005 | Counts, streaks and reports are always computed from the log, never stored. |
| BR-006 | Changing method, madhab or location rewrites only entries that are `pending` and whose `window_end` is in the future. Everything else keeps its recorded values. |
| BR-007 | Every status change goes through `PrayerService`, in one transaction that updates the entry and appends the event. |
| BR-008 | A notification action is idempotent: if the entry is no longer `pending`, it is ignored and nothing is overwritten. |
| BR-009 | An entry is never created for a prayer whose window ended before `tracking_started_at`. |

### 4.5 Derived queries

```sql
-- qaza count per prayer
SELECT prayer, COUNT(*) FROM prayer_log WHERE status = 'qaza' GROUP BY prayer;

-- oldest qaza overall (Recovery hero): date, then prayer order
SELECT * FROM prayer_log WHERE status = 'qaza'
ORDER BY prayer_date ASC,
  CASE prayer WHEN 'fajr' THEN 1 WHEN 'dhuhr' THEN 2 WHEN 'asr' THEN 3 WHEN 'maghrib' THEN 4 ELSE 5 END
LIMIT 1;

-- qaza dates for one prayer, oldest first
SELECT * FROM prayer_log WHERE status = 'qaza' AND prayer = ? ORDER BY prayer_date ASC;

-- recovered this week (Recovery note)
SELECT COUNT(*) FROM prayer_event WHERE type = 'SETTLED' AND created_at >= ?;

-- days where all five were on time (streaks)
SELECT prayer_date FROM prayer_log GROUP BY prayer_date HAVING SUM(status = 'on_time') = 5 ORDER BY prayer_date;
```

**Streak.** A day is complete when all five prayers are `on_time`. Current streak: start at today if today is complete, otherwise at yesterday (today in progress does not break it), then count back while days are complete. A date with no row breaks the streak. Longest streak is the longest run of consecutive complete dates. `settled` does not count as on time.

### 4.6 Backup file

```json
{
  "schema_version": 1,
  "exported_at": "2026-11-10T09:00:00.000Z",
  "app_version": "1.0.0",
  "settings": { },
  "prayer_logs": [ ],
  "prayer_events": [ ]
}
```

Same shape as SDD section 6.7 without the cache. Import validates every row (enums, UUIDs, uniqueness) and rejects the whole file on the first error.

---

## 5. Core modules

### 5.1 Constants

```ts
export const AUTO_QAZA_GRACE_MIN = 180;
export const CATCHUP_MAX_DAYS = 3;
export const LOCATION_CHANGE_THRESHOLD_M = 1000;
export const LOCATION_RECHECK_MIN = 360;              // at most once per 6 h on foreground
export const SCHEDULE_HORIZON_DAYS = { ios: 7, android: 14 };
export const UNDO_WINDOW_MS = 5000;
export const RANGE_ADD_MAX_DAYS = 7305;               // 20 years per operation
export const MIN_BACKDATE = "1990-01-01";
```

### 5.2 Dates, prayer times and windows

**Dates.** All date math uses the device time zone. `toLocalDate(d)`, `addDays(ld, n)`, `startOfLocalDay(ld)`. No time zone library.

**Formatting.** `formatDateWithDay(ld, locale)` returns "3 August, Monday" (build it from `Intl.DateTimeFormat.formatToParts`, because `en-GB` puts the weekday first). `formatTime(iso, locale)` returns "4:32 PM" (12-hour). A 24-hour option is later.

**Prayer times.** `computeDayTimes(date, settings): DayTimes` wraps `adhan`:

```ts
const c = new Coordinates(lat, lng);
const p = CalculationMethod[method]();
p.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
p.highLatitudeRule = HighLatitudeRule.recommended(c);
const t = new PrayerTimes(c, dateAtLocalMidnight, p);
```

It MUST validate: all six times are valid dates and strictly increasing (fajr < sunrise < dhuhr < asr < maghrib < isha). Otherwise it throws `PrayerTimeError`. This is a verified case: at Tromsø (69.65 N) on 21 June, `fajr`, `sunrise`, `maghrib` and `isha` come back invalid even with the recommended rule, and on 21 December `sunrise` and `maghrib` do. Oslo (59.9 N) and London are valid. The UI shows: "We can't calculate reliable prayer times at this latitude yet" and blocks setup. No fallback in the MVP.

**Windows.** For date D (all times for D unless noted):

| Prayer | Starts | Ends |
|---|---|---|
| Fajr | fajr | sunrise |
| Dhuhr | dhuhr | asr |
| Asr | asr | maghrib |
| Maghrib | maghrib | isha |
| Isha | isha | fajr of D+1 |

Between sunrise and dhuhr there is no active window. `getWindows(date, settings)` computes D and D+1.

**Golden fixtures** (device time zone matching the location, `adhan` 4.4.6, results are to the minute):

| Case | fajr | sunrise | dhuhr | asr | maghrib | isha | next fajr |
|---|---|---|---|---|---|---|---|
| Dhaka 23.8103, 90.4125 · 2026-11-10 · Karachi · Hanafi | 04:52 | 06:10 | 11:43 | 15:39 | 17:15 | 18:32 | 04:52 |
| Dhaka · 2026-06-21 · Karachi · Hanafi | 03:44 | 05:12 | 12:01 | 16:41 | 18:48 | 20:16 | 03:44 |
| Dhaka · 2026-11-10 · MuslimWorldLeague · Shafi | 04:52 | 06:10 | 11:43 | 14:52 | 17:15 | 18:28 | 04:52 |

UTC form of the first row: fajr `2026-11-09T22:52:00.000Z`, sunrise `2026-11-10T00:10:00.000Z`, dhuhr `…05:43Z`, asr `…09:39Z`, maghrib `…11:15Z`, isha `…12:32Z`, next fajr `2026-11-10T22:52:00.000Z`. Also test: Oslo and London on 21 June are valid, Tromsø on 21 June and 21 December throws `PrayerTimeError`.

These are regression fixtures produced by the library itself, not independent truth. Before release, compare the Dhaka values with an official local timetable (for Dhaka, the Islamic Foundation Bangladesh) and settle open decision O-1.

### 5.3 Repository interface

```ts
export interface Repository {
  transaction<T>(fn: (tx: RepoTx) => Promise<T>): Promise<T>;
  // reads
  getEntry(date: LocalDate, prayer: PrayerName): Promise<PrayerLogEntry | null>;
  getEntriesForDate(date: LocalDate): Promise<PrayerLogEntry[]>;
  getEntriesInRange(from: LocalDate, to: LocalDate): Promise<PrayerLogEntry[]>;
  listPendingOpen(): Promise<PrayerLogEntry[]>;            // status = pending
  qazaCounts(): Promise<Record<PrayerName, number>>;
  qazaByPrayer(p: PrayerName): Promise<PrayerLogEntry[]>;
  oldestQaza(): Promise<PrayerLogEntry | null>;
  completeDays(): Promise<LocalDate[]>;
  settledSince(iso: IsoUtc): Promise<number>;
  getSetting<T>(key: string): Promise<T | null>;
  exportAll(): Promise<BackupFile>;
}
// RepoTx adds the writes: insertEntry, updateEntry, insertEvent, setSetting, replaceAll, deleteAll.
// RepoTx is only reachable inside transaction(), and only PrayerService calls it (BR-007).
```

Two implementations: `InMemoryRepository` (core tests) and `SqliteRepository` (mobile). Both MUST pass the same contract test suite.

### 5.4 PrayerService

```ts
class PrayerService {
  constructor(repo: Repository, clock: Clock, newId: () => string, settings: SettingsProvider)

  ensureDay(date: LocalDate): Promise<PrayerLogEntry[]>          // INSERT OR IGNORE five rows, BR-009 applied
  answer(date, prayer, answer: "prayed" | "not_prayed"): Promise<Result>   // idempotent, BR-008
  setStatus(date, prayer, to: PrayerStatus, opts?: { undo?: boolean }): Promise<Result>
  settle(date, prayer): Promise<Result>
  addQazaRange(from, to, prayers: PrayerName[]): Promise<{ created: number; skipped: number }>
  rewriteOpenWindows(): Promise<number>                          // BR-006
  reconcile(now?: Date): Promise<ReconcileReport>
}
```

Every method that changes status: loads the entry, checks the transition table (section 4.3) and BR-003, then in one transaction writes the entry and the event. Returns `{ ok: true, entry, event }` or a typed error. Callers that cancel notifications do so from the returned result.

**`addQazaRange`** loops dates and prayers. For each (date, prayer): no row, then insert `qaza`, `manual`, event `MARKED_QAZA`; row exists with `qaza`, skip; row exists with any other status, skip and count. Back-dated rows have `window_start/end = null`, current location and settings. One transaction, chunked by 500 days with a progress callback. Dates must be in `[MIN_BACKDATE, yesterday]` and the span at most `RANGE_ADD_MAX_DAYS`.

### 5.5 Reconcile

Runs on launch, on foreground, after a notification response, and after settings change.

```
reconcile(now):
  today = toLocalDate(now)
  start = max(date(tracking_started_at), addDays(today, -CATCHUP_MAX_DAYS))
  for date in start..today:
      ensureDay(date)                          // skips windows ending before tracking_started_at
  for e in repo.listPendingOpen():
      if e.window_end is not null and now >= e.window_end + AUTO_QAZA_GRACE_MIN:
          setStatus(e, "qaza", type AUTO_QAZA, source auto)
  return report { created, autoQaza }
```

Entries older than the catch-up window are never created: an unanswered check-in older than 3 days is dropped, not counted.

### 5.6 Notification planner (pure)

```ts
planNotifications(now, settings, horizonDays, answered: Set<string>): Planned[]
// Planned = { id: "checkin:2026-11-10:asr", fireAt: IsoUtc, prayer, date, quiet: boolean }
//         | { id: "sentinel", fireAt: IsoUtc }
```

Rules: for each date from yesterday to today + horizon − 1, for each window, skip if the key is in `answered`, skip if `fireAt = window_end` is within 5 seconds of now or earlier, `quiet = (prayer === "isha")`. Add one sentinel at the last check-in time plus 10 minutes. `diffPlan(planned, existingFromOS)` returns ids to cancel and items to schedule. A planned item whose trigger moved by more than 30 seconds counts as changed. The OS list (`getAllScheduledNotificationsAsync`) is the source of truth, there is no mirror table.

---

## 6. Notifications

### 6.1 What is sent

| Kind | When | Purpose |
|---|---|---|
| Check-in | At each window end | Ask "did you pray?" with two actions |
| Sentinel | After the last scheduled check-in | "Open Salah Tracker to keep your reminders going." Needed because the schedule is rolling |

Nothing else in the MVP.

### 6.2 Copy and actions

| | English |
|---|---|
| Title | `{Prayer} time has ended` |
| Body | `Did you pray {Prayer}?` |
| Action 1 | `Prayed` (id `PRAYED`) |
| Action 2 | `Not prayed` (id `NOT_PRAYED`) |
| Sentinel title and body | `Keep reminders on` / `Open Salah Tracker to keep your reminders going.` |

Category id `PRAYER_CHECKIN`, both actions with `opensAppToForeground: false`. Payload: `{ kind: "checkin", date, prayer }`. Notification identifier is the plan id, so rescheduling is deterministic. Bengali (later): the question is "আপনি কি আজকের '{নামাজ}' পড়েছেন?" with "পড়েছি" and "পড়িনি".

**Isha is quiet.** Its window ends at the next Fajr, so the check-in lands at dawn. Isha check-ins use no sound and no vibration (a separate low-importance Android channel, `sound: false` on iOS). Today also shows the question, so nothing depends on the notification alone. See O-3.

### 6.3 When to rebuild the schedule

On app launch, on foreground, after any answer (cancel that key and dismiss its delivered notification), after location, method, madhab or reminders toggle change, and when the device time zone changes. Steps: `reconcile` → build `answered` from the log → `planNotifications` → `diffPlan` → cancel and schedule.

Horizon: 7 days on iOS (36 notifications including the sentinel, under the 64 limit), 14 days on Android.

### 6.4 Handling a response

```
onResponse(r):
  key = r.notification.identifier + ":" + r.actionIdentifier
  if key == settings.last_handled_response: return
  if r.data.kind == "test": show toast "Test action received"; return
  if action is PRAYED or NOT_PRAYED:
      ensureDay(date); answer(date, prayer, ...)        // idempotent, BR-008
      cancel scheduled and dismiss delivered notification for that key
  else (plain tap): navigate to Today
  settings.last_handled_response = key
```

Register the listener at app start, and also call `getLastNotificationResponseAsync()` once on launch for the cold-start case. If an action cannot be applied (for example the entry is not found), the entry stays `pending` and Today asks again. An answer must never be lost silently.

### 6.5 Permissions and platform behavior

- Ask for notification permission in onboarding step 3, after explaining why. Android 13+ is a runtime permission. If denied, the app works manually and Today shows the "Reminders are off" banner with an Open settings button.
- **Android:** create channels `checkin` (importance high) and `checkin-quiet` (importance low). Timing accuracy and exact alarms are decided by spike S1. Do not add the exact alarm permission unless S1 shows inexact delivery misses the ±2 minute target, and then follow the current Play policy for that permission.
- **iOS:** categories carry the two actions. 64 pending limit handled by the 7-day horizon.

### 6.6 Reminder health screen (Settings → Reminders)

Shows: permission status with an Open settings link; on Android a battery-optimization card with a button to the system exemption screen (`expo-intent-launcher`) and a collapsible list of manufacturer tips (autostart, lock in recents, battery saver); "N reminders scheduled, next at 4:32 PM"; and **Send a test reminder** (fires in 10 seconds, same category and channel, payload `kind: "test"`, writes nothing to the database). The screen is also offered once after onboarding on Android.

### 6.7 Delivery contract

Check-in notifications fire within ±2 minutes of window end with the app foregrounded, backgrounded, swiped away, and after a device reboot, on the device matrix in section 11.3.

### 6.8 Spike S1 (days 1 and 2, before any UI work)

Build a throwaway screen that schedules 10 check-in notifications with the real category. Run on a Pixel, a Samsung and a Xiaomi/Redmi with battery saver on and the screen off for 3 hours.

Pass criteria:
1. Every notification appears within ±2 minutes.
2. Tapping **Prayed** with the app swiped away writes the answer in at least 19 of 20 attempts (check by opening the app).
3. Scheduled notifications survive a reboot.

Fallbacks if criterion 2 fails, in order: (a) set `opensAppToForeground: true` so the tap opens a one-tap confirmation screen that applies the answer, (b) write a small native action receiver for the stuck platform. Record the outcome here and update this spec before milestone M2.

---

## 7. Screens

Navigation: onboarding stack until `onboarding_done`, then tabs **Today, Recovery, Journey, Settings** (Expo Router). Components come from `DESIGN.md` section 7. Colors only from `tokens.ts`. Every screen supports light, dark, empty and error states.

### 7.1 Onboarding (3 steps, plus Android battery step)

1. **Welcome.** Name, one-line promise, Get started.
2. **Setup.** Location: Auto-detect (foreground location permission, coarse is enough) or Choose a city (search the bundled `cities.json`) or enter coordinates. Method (picker of the 11 methods). Madhab (Hanafi / Shafi). Defaults per O-1. If `computeDayTimes` throws for the chosen location, show the latitude message and do not continue. Show a live preview of today's five times so the user can sanity-check.
3. **Notifications.** Explain the check-in, request permission, Maybe later link.
4. **Android only: reliability.** The battery card from 6.6, skippable.

On finish: save settings, set `tracking_started_at = now`, run `reconcile` and the notification rebuild, go to Today.

### 7.2 Today

Header: date with day name, location label, streak badge (hidden when the streak is 0).

Body, top to bottom:
1. **Hero.** State A: inside a window, shows Current prayer, remaining time, end time, and **Mark as prayed** (disabled outside the window, BR-003). State B: between sunrise and dhuhr, or after the current prayer is answered, shows Next prayer with a countdown and no button; when answered, add a small "{Prayer}: on time" pill. After midnight and before Fajr the hero shows yesterday's Isha with its date.
2. **Needs your answer.** For every entry that is `pending` and whose window has ended: a card "Did you pray {Prayer}?" with Prayed and Not prayed buttons. This is the in-app twin of the notification and works when notifications are off.
3. **Prayer strip.** Today's five entries with status icon, label and color, current one highlighted.
4. **Reminders-off banner** when permission is denied.

Countdown text refreshes once a minute, aligned to the minute boundary, only while the app is foregrounded. Format: "2h 14m" above 60 minutes, "27 minutes remaining" below.

### 7.3 Recovery

- **Recovery hero** (lime gradient): oldest qaza, "{Prayer} · {date with day name}", **Mark completed** settles it, with the undo snackbar.
- **Note:** "You've recovered N prayers this week." (hidden when 0).
- **Qaza by prayer:** five rows with count or "All clear". Tap a row: **Qaza dates** list (oldest first), each row with a Settle button.
- Empty state when total qaza is 0: "All clear", button Back to Today.

### 7.4 Journey

- **Stats:** current streak, longest streak.
- **Calendar:** month grid with the dot rules below, previous and next month, tap the month title to jump to any month (date picker). Future dates are disabled. Today has the outline.
- **Day dots:** no row for that date: neutral small dot. Five rows all `on_time`: filled green. Any row `qaza` or `settled`: hollow amber ring. Other mixes: neutral small dot.
- **Day detail** under the calendar: date with day name, "N qaza · N on time", five prayer rows. Each row shows time and a status pill (no row shows "No record"). Tap a row to open a bottom sheet with the allowed actions from the state machine: On time, Qaza, Settle (only if currently qaza), Undo settle (only if currently settled). Rows for prayers that have not started today are disabled.
- **Add qaza for a date range** button: bottom sheet with From and To dates, prayer checkboxes (all selected), a live line "This adds 1,825 qaza prayers", Add. The result toast reads "Added 1,825. Skipped 12 that already had records."
- **Auto-logged marker:** entries with `source: auto` show a small "auto" tag and the hint "Tap to correct".

### 7.5 Settings

Sections: **Prayer** (location with mode, method, madhab), **Reminders** (toggle, Reminder health), **Appearance** (System / Light / Dark), **Data** (Export backup, Import backup, Send pilot report, Delete all data), **About** (version, privacy policy, terms, GeoNames attribution). Changing location, method or madhab shows no dialog: it runs `rewriteOpenWindows`, rebuilds notifications, and shows a toast "Prayer times updated". Past records are untouched (BR-006).

Delete all data opens a confirm sheet that shows how many entries and which date range will be deleted. It is the only destructive confirmation in the app.

### 7.6 Shared behavior

- **Undo snackbar:** after Mark as prayed, Mark completed and Settle, show "{message}. Undo" for 5 seconds. Undo is `setStatus(previous, { undo: true })`, which appends a `CORRECTED` event.
- No confirmation dialogs for Prayed, Not prayed or Settle. Undo is the safety net.
- All strings come from `t(key)`. Only `en.json` ships; a `bn.json` stub exists. Numbers and dates use `Intl` with the active locale.
- Status is always icon + label + color. Accessibility labels read like "Fajr, qaza".

---

## 8. Stories and acceptance criteria

Priority P0 ships in the MVP, P1 if time allows inside the 4 weeks.

**M-01 Onboarding and setup (P0)**
- Given a fresh install, when the user finishes step 3, then settings are saved, `tracking_started_at` is set and Today opens.
- Given location permission is denied, then the city picker is offered and works with no network.
- Given a polar latitude, then the user sees the latitude message and cannot continue.

**M-02 Prayer times and windows (P0)**
- The three golden fixtures match to the minute. Oslo and London are valid. Tromsø throws `PrayerTimeError`.
- Windows follow the table in 5.2, Isha ends at the next day's Fajr.

**M-03 Today (P0)**
- At 14:00 on the first day, Fajr has no row (BR-009), Dhuhr is `pending`, and the hero shows Dhuhr.
- At 06:30 (after sunrise) the hero shows Next prayer: Dhuhr with no button.
- At 01:00 the hero shows yesterday's Isha with its date.
- Mark as prayed sets `on_time`, writes one event, cancels that check-in, shows the undo snackbar.
- A `pending` entry whose window ended shows the "Needs your answer" card with working buttons.

**M-04 Check-in notification (P0)**
- A check-in fires at each window end with the two actions and the copy in 6.2. Isha's is quiet.
- Tapping Prayed writes `on_time` once. Tapping Not prayed writes `qaza` once. Delivering the same response twice changes nothing (BR-008).
- If the user answered in the app first, that check-in was cancelled and never fires.
- The schedule keeps a sentinel and stays under the iOS limit.

**M-05 Reconcile and auto-qaza (P0)**
- Exactly at `window_end + 180 min` a still-`pending` entry becomes `qaza` with `AUTO_QAZA`, `source: auto`. One minute earlier it stays `pending`.
- After 10 days away, only the last 3 days have rows. Older days show "No data".
- Reconcile run twice in a row creates nothing the second time.

**M-06 Qaza ledger and Recovery (P0)**
- Counts equal `COUNT(status = qaza)` per prayer, and update immediately after any change.
- Hero shows the oldest qaza by date, then prayer order.
- Empty state appears when the total is 0.

**M-07 Journey calendar and day detail (P0)**
- Dots follow 7.4. Future dates cannot be opened.
- Tapping a row offers only valid transitions. An invalid one is not shown.
- Any edit writes one entry update and one `CORRECTED` (or typed) event in one transaction.

**M-08 Settle and undo (P0)**
- Settle turns `qaza` into `settled` and the count drops by one. Undo within 5 seconds restores `qaza` and appends a `CORRECTED` event. Nothing is deleted.

**M-09 Add qaza for a date range (P0)**
- Adding Fajr for 365 days creates 365 `qaza` rows with `source: manual`. Running it again creates 0 and skips 365.
- Rows with other statuses are skipped and counted, never overwritten.
- 7,305 days × 5 prayers completes in 5 seconds or less on the reference device, with a progress indicator and no UI freeze.
- Dates before `MIN_BACKDATE`, after yesterday, or spans over 7,305 days are rejected with a message.

**M-10 Reliability tools (P0)**
- The test reminder arrives in about 10 seconds and its Prayed button shows the "Test action received" toast, without touching the log.
- The screen shows the real scheduled count and next time, and the battery button opens the system screen on Android.

**M-11 Backup (P0)**
- Export produces a file through the share sheet. Importing it on a clean install gives identical entries and events (compare row by row).
- A corrupt or wrong-version file is rejected whole with a clear message, and the existing data is unchanged.
- Delete all data empties the tables and restarts onboarding.
- After the 50th entry, a one-time banner suggests exporting a backup (risk R7).

**M-12 Settings and theme (P0)**
- Changing method or madhab at 10:00 rewrites windows of today's `pending` entries whose window has not ended, and leaves answered and past entries unchanged (BR-006). Notifications are rescheduled.
- Theme switches instantly in light, dark and system.

**M-13 Streaks (P1)**
- Matches the algorithm in 4.5 on the unit-test scenarios. The badge hides at 0.

**M-14 Pilot report (P1)**
- Settings → Send pilot report shows the exact JSON first: app version, days active, average answered per day, qaza created per week, qaza settled per week. No dates of individual prayers, no location, no identifiers. Sending goes through the OS share sheet only.

**M-15 Accessibility and performance pass (P1)**
- Section 9 targets are met and the DESIGN.md accessibility rules hold on every screen.

---

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Start-up | Today interactive in 2.0 seconds or less on a mid-range 4 GB Android |
| Interaction | Tap to updated UI in 100 ms or less. Single status transaction in 50 ms or less |
| Bulk | Range add of 36,525 rows in 5 seconds or less with progress |
| Offline | Every feature works in airplane mode. The release build makes no network requests (reverse geocoding for the location label is best effort and optional) |
| Reliability | Section 6.7. No lost answers |
| Privacy | No analytics or crash SDK. Location is read on device and used only to calculate prayer times |
| Accessibility | `DESIGN.md` section 9: contrast, 44 px targets, focus, labels, reduced motion, 130% font scale |
| Size | Install size target 40 MB or less |
| Compatibility | Expo SDK default minimum OS versions. Verify behavior on the lowest Android version you support |

---

## 10. Permissions, privacy and stores

### 10.1 Permissions

| Permission | Why | Notes |
|---|---|---|
| Notifications | The check-in | Android 13+ runtime prompt, iOS prompt |
| Location, while in use | Prayer times | Coarse is enough. No background location, ever |

iOS `NSLocationWhenInUseUsageDescription`: "Salah Tracker uses your location only to calculate prayer times on your device."

### 10.2 Privacy statements to publish

- All data stays on the device. There is no account and no server.
- Location is used on device for prayer times and is never sent anywhere by the app.
- The OS may include app data in its own backup (Android Auto Backup, iCloud device backup) according to the user's device settings. Verify restore on a test device before claiming it.
- Backup files are created only when the user exports them.

### 10.3 Attribution

City list from GeoNames, license CC BY 4.0, credited in About. Ship a subset: all Bangladesh district headquarters and major towns plus world cities above 100,000 people, about 250 KB. Accent-insensitive search.

### 10.4 Opt-in pilot report

Defined in M-14. It is the only measurement channel.

---

## 11. Testing

### 11.1 Unit tests (core, Jest, `FakeClock`)

Golden fixtures (5.2), the transition table (every valid and invalid pair), BR-001 to BR-009, and these scenarios:

| # | Scenario |
|---|---|
| T1 | First launch at 14:00: no Fajr row, Dhuhr `pending` |
| T2 | Answer applied from a notification: one status change, one event |
| T3 | Same response delivered twice: no change the second time |
| T4 | Auto-qaza boundary at exactly `window_end + 180 min` and one minute before |
| T5 | 10-day absence: only the last 3 days materialized |
| T6 | Method change at 10:00: only open `pending` entries rewritten |
| T7 | 01:00: active window is yesterday's Isha |
| T8 | Location moves 1.2 km: updated. 0.8 km: unchanged |
| T9 | Range add 365 days twice: 365 then 0 |
| T10 | Backup export then import: identical data |
| T11 | Streak: today incomplete does not break, a gap breaks, `settled` does not count |
| T12 | Polar latitude: `PrayerTimeError` |
| T13 | Planner: iOS plan has 36 or fewer items, answered keys are skipped, sentinel present |

### 11.2 Contract tests

One suite run against `InMemoryRepository` and `SqliteRepository` (Node SQLite or the Expo test environment). Identical results required. Also test the migration runner from an empty database.

### 11.3 Device matrix and soak test

| Device class | Why |
|---|---|
| Pixel, stock Android | Baseline |
| Samsung (One UI) | Common, aggressive battery modes |
| Xiaomi / Redmi (HyperOS or MIUI) | Most aggressive background limits |
| Realme or Oppo (ColorOS) | Common in Bangladesh |
| iPhone (current and one back), after M5 | iOS behavior |

**24-hour soak:** install, finish onboarding, force-stop the app, enable battery saver, lock the phone. Record the actual time of every check-in against its planned time in a table. Repeat once after a reboot and once with Prayed tapped from the lock screen.

### 11.4 Manual scenarios

Fresh install; deny location then pick a city; deny notifications then use the app manually; airplane mode for a full day; change time zone; set the device clock across midnight; import a backup on a second phone; add a 10-year backlog and scroll the calendar.

---

## 12. Milestones

One developer, Android first. The earlier outline said 2 to 3 weeks. With range add, backup and reliability tools added, plan about **4 weeks**.

| Milestone | Days | Deliverable | Exit criteria |
|---|---|---|---|
| M0 Setup and spike | 1 to 2 | Repo, CI, S1 spike | S1 pass criteria recorded in 6.8 |
| M1 Core | 1 to 5 | Dates, prayer times, windows, repository, service, reconcile, planner | T1 to T13 and contract tests green |
| M2 Shell | 6 to 9 | Theme, components, onboarding, Today, Settings basics | M-01, M-02, M-03, M-12 pass |
| M3 Notifications | 10 to 13 | Adapter, channels, handlers, reminder health | M-04, M-05, M-10 pass on three devices |
| M4 Ledger | 14 to 18 | Recovery, Journey, day detail, settle and undo, range add, streaks | M-06, M-07, M-08, M-09, M-13 pass |
| M5 Hardening | 19 to 22 | Backup, pilot report, accessibility, performance, 24-hour soak | M-11, M-14, M-15 pass, soak table meets 6.7 |
| M6 Pilot | 23 onward | Play internal testing, privacy policy, 5 to 10 users for 2 weeks, then iOS TestFlight | Metrics in 1.2 reviewed |

---

## 13. Release checklist

- [ ] Application id (Android) and bundle id (iOS) decided before the first EAS build. They cannot change after publishing (O-5)
- [ ] App icon and splash (open item in DESIGN.md)
- [ ] Privacy policy hosted at a public URL, matching section 10.2
- [ ] Store data-safety form: no data collected, location processed on device only
- [ ] Permission explanations written for both stores
- [ ] Target API level meets the current Play requirement. Check at release time
- [ ] Check the Play Console rules for new developer accounts (closed-testing tester count and duration) and plan the account type early (O-6)
- [ ] Signed release build through EAS, tested from the store track, not a debug build
- [ ] Soak test table attached to the release notes
- [ ] Store listing text and screenshots (English first)
- [ ] iOS: Apple Developer Program enrollment, Info.plist strings, TestFlight build

---

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Notification actions do not run when the app is swiped away | Spike S1 first, fallbacks in 6.8, in-app "Needs your answer" card as the safety net |
| R2 | OEM battery managers kill reminders | Reminder health screen, manufacturer tips, soak test on Xiaomi and Samsung |
| R3 | iOS 64-notification limit | 7-day rolling horizon and sentinel |
| R4 | Selected city is in a different time zone than the device | MVP assumes they match and shows times in the device zone. Document in About |
| R5 | Calculated times differ from local authorities | Compare to an official timetable before release, open decision O-1 |
| R6 | Wrong qaza counts erode trust | Auto-qaza is marked and correctable, catch-up is capped, nothing is deleted, undo everywhere |
| R7 | Data lost when the phone is lost or the app is uninstalled | Manual export, OS backup, and a one-time nudge to export after the first 50 entries |
| R8 | Migration bug corrupts data | Migration runner tested from empty and from each prior version, backup prompt before future migrations |
| R9 | Polar latitude users blocked | Clear message. Fallback rules are a later feature |
| R10 | Draft Bengali strings are wrong | Native review before the Bengali release |

---

## 15. Open decisions for the product owner

| # | Decision | Default used in this spec |
|---|---|---|
| O-1 | Default method and madhab. Compare against the official Dhaka timetable | Karachi and Hanafi when the location is in Bangladesh, India or Pakistan, otherwise MuslimWorldLeague and Shafi. Always changeable |
| O-2 | Auto-qaza grace | 180 minutes after window end |
| O-3 | Isha check-in time and loudness | At the next Fajr, quiet |
| O-4 | Catch-up cap | 3 days |
| O-5 | Application id and bundle id | Undecided, must be set before the first build |
| O-6 | Developer account type for Google Play | Undecided. Affects testing requirements and the timeline |
| O-7 | Does "Not prayed" need a confirm tap | No. Undo covers it |
| O-8 | Range add maximum | 20 years per operation |

---

## 16. After the MVP

Order of value: Google Drive sync (reuses the backup shape and `schema_version`), Insights tab, "closing soon" reminder, widget, Bengali UI after native string review, dua cards, PWA, Aladhan cross-check, 24-hour clock option, heatmap and milestones.

When Drive sync arrives, add `updated_at`-based merge by `id` as in SDD section 2.8. The `prayer_log` and `prayer_event` tables already carry the fields it needs.
