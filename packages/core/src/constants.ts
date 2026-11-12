// Salah Tracker core — spec §5.1 constants. Frozen contract (WO-00).
export const AUTO_QAZA_GRACE_MIN = 180;
export const CATCHUP_MAX_DAYS = 3;
export const LOCATION_CHANGE_THRESHOLD_M = 1000;
export const LOCATION_RECHECK_MIN = 360;
export const SCHEDULE_HORIZON_DAYS = { ios: 7, android: 14 } as const;
export const UNDO_WINDOW_MS = 5000;
export const RANGE_ADD_MAX_DAYS = 7305;
export const MIN_BACKDATE = "1990-01-01";
export const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
