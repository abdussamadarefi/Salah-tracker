// Shared harness for core tests. Tests run with TZ=Asia/Dhaka
// (package.json test script), so local times below are Dhaka times.
import { defaultNewId, FakeClock } from "../src/clock";
import type { Settings, SettingsProvider } from "../src/models";
import { PrayerService } from "../src/prayerService";
import { InMemoryRepository } from "../src/testing/inMemoryRepository";

export class MutableSettings implements SettingsProvider {
  constructor(public settings: Settings) {}

  async getSettings(): Promise<Settings> {
    return this.settings;
  }
}

export function dhakaSettings(
  overrides: Partial<Settings> = {},
): Settings {
  return {
    location: { lat: 23.8103, lng: 90.4125, label: "Dhaka", mode: "manual" },
    method: "Karachi",
    madhab: "hanafi",
    timezone: "Asia/Dhaka",
    notifications_enabled: true,
    theme: "system",
    onboarding_done: true,
    tracking_started_at: "2026-11-01T00:00:00.000Z",
    last_location_check_at: null,
    last_handled_response: null,
    ...overrides,
  };
}

export interface Harness {
  repo: InMemoryRepository;
  clock: FakeClock;
  provider: MutableSettings;
  service: PrayerService;
}

export function makeHarness(
  nowIso: string,
  settingsOverrides: Partial<Settings> = {},
): Harness {
  const repo = new InMemoryRepository();
  const clock = new FakeClock(nowIso);
  const provider = new MutableSettings(dhakaSettings(settingsOverrides));
  const service = new PrayerService(repo, clock, defaultNewId, provider);
  return { repo, clock, provider, service };
}

/** "HH:MM" of a Date in the given IANA zone (default Asia/Dhaka). */
export function hhmm(d: Date, timeZone = "Asia/Dhaka"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
