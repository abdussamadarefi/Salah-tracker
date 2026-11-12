import { PrayerTimeError } from "../src/errors";
import { computeDayTimes } from "../src/prayerTimes";
import type { Settings } from "../src/models";
import { dhakaSettings, hhmm } from "./helpers";

function settingsFor(
  lat: number,
  lng: number,
  method: Settings["method"] = "Karachi",
  madhab: Settings["madhab"] = "hanafi",
): Settings {
  return dhakaSettings({
    location: { lat, lng, label: "test", mode: "manual" },
    method,
    madhab,
  });
}

describe("golden fixtures (spec §5.2)", () => {
  it.each([
    {
      label: "Dhaka 2026-11-10 Karachi/Hanafi",
      date: "2026-11-10",
      settings: settingsFor(23.8103, 90.4125, "Karachi", "hanafi"),
      expected: {
        fajr: "04:52",
        sunrise: "06:10",
        dhuhr: "11:43",
        asr: "15:39",
        maghrib: "17:15",
        isha: "18:32",
        nextFajr: "04:52",
      },
    },
    {
      label: "Dhaka 2026-06-21 Karachi/Hanafi",
      date: "2026-06-21",
      settings: settingsFor(23.8103, 90.4125, "Karachi", "hanafi"),
      expected: {
        fajr: "03:44",
        sunrise: "05:12",
        dhuhr: "12:01",
        asr: "16:41",
        maghrib: "18:48",
        isha: "20:16",
        nextFajr: "03:44",
      },
    },
    {
      label: "Dhaka 2026-11-10 MuslimWorldLeague/Shafi",
      date: "2026-11-10",
      settings: settingsFor(23.8103, 90.4125, "MuslimWorldLeague", "shafi"),
      expected: {
        fajr: "04:52",
        sunrise: "06:10",
        dhuhr: "11:43",
        asr: "14:52",
        maghrib: "17:15",
        isha: "18:28",
        nextFajr: "04:52",
      },
    },
  ])("$label matches to the minute", ({ date, settings, expected }) => {
    const t = computeDayTimes(date, settings);
    expect(hhmm(t.fajr)).toBe(expected.fajr);
    expect(hhmm(t.sunrise)).toBe(expected.sunrise);
    expect(hhmm(t.dhuhr)).toBe(expected.dhuhr);
    expect(hhmm(t.asr)).toBe(expected.asr);
    expect(hhmm(t.maghrib)).toBe(expected.maghrib);
    expect(hhmm(t.isha)).toBe(expected.isha);
    expect(hhmm(t.nextFajr)).toBe(expected.nextFajr);
  });

  it("matches the UTC row of the first fixture exactly", () => {
    const t = computeDayTimes(
      "2026-11-10",
      settingsFor(23.8103, 90.4125, "Karachi", "hanafi"),
    );
    expect(t.fajr.toISOString()).toBe("2026-11-09T22:52:00.000Z");
    expect(t.sunrise.toISOString()).toBe("2026-11-10T00:10:00.000Z");
    expect(t.dhuhr.toISOString()).toBe("2026-11-10T05:43:00.000Z");
    expect(t.asr.toISOString()).toBe("2026-11-10T09:39:00.000Z");
    expect(t.maghrib.toISOString()).toBe("2026-11-10T11:15:00.000Z");
    expect(t.isha.toISOString()).toBe("2026-11-10T12:32:00.000Z");
    expect(t.nextFajr.toISOString()).toBe("2026-11-10T22:52:00.000Z");
  });
});

describe("validity", () => {
  it("returns strictly increasing times", () => {
    const t = computeDayTimes(
      "2026-11-10",
      settingsFor(23.8103, 90.4125, "Karachi", "hanafi"),
    );
    const ordered = [
      t.fajr,
      t.sunrise,
      t.dhuhr,
      t.asr,
      t.maghrib,
      t.isha,
      t.nextFajr,
    ];
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1];
      const cur = ordered[i];
      expect(prev !== undefined && cur !== undefined).toBe(true);
      if (prev !== undefined && cur !== undefined) {
        expect(cur.getTime()).toBeGreaterThan(prev.getTime());
      }
    }
  });

  it("Oslo and London on 21 June 2026 are valid (T12)", () => {
    for (const [lat, lng] of [
      [59.9139, 10.7522],
      [51.5074, -0.1278],
    ] as const) {
      const t = computeDayTimes(
        "2026-06-21",
        settingsFor(lat, lng, "MuslimWorldLeague", "shafi"),
      );
      for (const d of [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha]) {
        expect(Number.isNaN(d.getTime())).toBe(false);
      }
    }
  });

  it("Tromsø on 21 June and 21 December throws PrayerTimeError (T12)", () => {
    for (const date of ["2026-06-21", "2026-12-21"]) {
      expect(() =>
        computeDayTimes(
          date,
          settingsFor(69.6492, 18.9553, "MuslimWorldLeague", "shafi"),
        ),
      ).toThrow(PrayerTimeError);
    }
  });

  it("throws PrayerTimeError with no location", () => {
    expect(() =>
      computeDayTimes("2026-11-10", dhakaSettings({ location: null })),
    ).toThrow(PrayerTimeError);
  });
});
