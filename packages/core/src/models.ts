// Salah Tracker core — spec §4.1 types. Frozen contract (WO-00).
import type { PRAYER_ORDER } from "./constants";

export type PrayerName = (typeof PRAYER_ORDER)[number];
export type PrayerStatus = "pending" | "on_time" | "qaza" | "settled";
export type Source = "auto" | "manual";
export type EventType =
  | "MARKED_ON_TIME"
  | "AUTO_QAZA"
  | "MARKED_QAZA"
  | "SETTLED"
  | "CORRECTED";
export type LocalDate = string; // "YYYY-MM-DD" in the device time zone
export type IsoUtc = string; // "2026-11-10T05:43:00.000Z"

export interface PrayerLogEntry {
  id: string;
  prayer_date: LocalDate; // local date of the window START (Isha after midnight keeps the previous date)
  prayer: PrayerName;
  status: PrayerStatus;
  source: Source;
  window_start: IsoUtc | null; // null for back-dated entries
  window_end: IsoUtc | null;
  timezone: string; // IANA
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
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "Dubai"
  | "MoonsightingCommittee"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Tehran"
  | "Turkey";

export interface LocationSetting {
  lat: number;
  lng: number;
  label: string;
  mode: "auto" | "manual";
}

export interface Settings {
  location: LocationSetting | null;
  method: CalculationMethodName;
  madhab: "hanafi" | "shafi";
  timezone: string; // IANA, device time zone
  notifications_enabled: boolean;
  theme: "system" | "light" | "dark";
  onboarding_done: boolean;
  tracking_started_at: IsoUtc | null;
  last_location_check_at: IsoUtc | null;
  last_handled_response: string | null;
}

export interface SettingsProvider {
  getSettings(): Promise<Settings>;
}

export interface DayTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  nextFajr: Date;
}

export interface PrayerWindow {
  prayer: PrayerName;
  date: LocalDate; // window-start date
  start: Date;
  end: Date;
}
