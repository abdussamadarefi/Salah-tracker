import { getWindows } from "../src/windows";
import { dhakaSettings, hhmm } from "./helpers";

const SETTINGS = dhakaSettings();

describe("getWindows (spec §5.2)", () => {
  it("follows the window table for Dhaka 2026-11-10", () => {
    const w = getWindows("2026-11-10", SETTINGS);
    expect(w.map((x) => x.prayer)).toEqual([
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ]);
    const byPrayer = new Map(w.map((x) => [x.prayer, x]));
    expect(hhmm(byPrayer.get("fajr")?.start ?? new Date(0))).toBe("04:52");
    expect(hhmm(byPrayer.get("fajr")?.end ?? new Date(0))).toBe("06:10");
    expect(hhmm(byPrayer.get("dhuhr")?.start ?? new Date(0))).toBe("11:43");
    expect(hhmm(byPrayer.get("dhuhr")?.end ?? new Date(0))).toBe("15:39");
    expect(hhmm(byPrayer.get("asr")?.start ?? new Date(0))).toBe("15:39");
    expect(hhmm(byPrayer.get("asr")?.end ?? new Date(0))).toBe("17:15");
    expect(hhmm(byPrayer.get("maghrib")?.start ?? new Date(0))).toBe("17:15");
    expect(hhmm(byPrayer.get("maghrib")?.end ?? new Date(0))).toBe("18:32");
    expect(hhmm(byPrayer.get("isha")?.start ?? new Date(0))).toBe("18:32");
    // Isha ends at the next day's Fajr.
    const isha = byPrayer.get("isha");
    expect(isha).toBeDefined();
    if (isha !== undefined) {
      expect(hhmm(isha.end)).toBe("04:52");
      expect(isha.end.toISOString()).toBe("2026-11-10T22:52:00.000Z");
    }
    for (const x of w) {
      expect(x.date).toBe("2026-11-10");
      expect(x.start.getTime()).toBeLessThan(x.end.getTime());
    }
  });

  it("leaves a gap between sunrise and dhuhr (no active window)", () => {
    const w = getWindows("2026-11-10", SETTINGS);
    const fajr = w.find((x) => x.prayer === "fajr");
    const dhuhr = w.find((x) => x.prayer === "dhuhr");
    expect(fajr).toBeDefined();
    expect(dhuhr).toBeDefined();
    if (fajr !== undefined && dhuhr !== undefined) {
      expect(dhuhr.start.getTime()).toBeGreaterThan(fajr.end.getTime());
    }
  });

  it("T7: at 01:00 the active window is yesterday's Isha", () => {
    const now = new Date("2026-11-11T01:00:00+06:00");
    const yesterday = getWindows("2026-11-10", SETTINGS);
    const isha = yesterday.find((x) => x.prayer === "isha");
    expect(isha).toBeDefined();
    if (isha !== undefined) {
      expect(isha.start.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(now.getTime()).toBeLessThan(isha.end.getTime());
    }
    // Today's Fajr has not started yet at 01:00.
    const today = getWindows("2026-11-11", SETTINGS);
    const fajr = today.find((x) => x.prayer === "fajr");
    expect(fajr).toBeDefined();
    if (fajr !== undefined) {
      expect(now.getTime()).toBeLessThan(fajr.start.getTime());
    }
  });
});
