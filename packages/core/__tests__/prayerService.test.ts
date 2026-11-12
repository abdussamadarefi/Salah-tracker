import {
  InvalidTransitionError,
  NotStartedError,
  PrayerTimeError,
  ValidationError,
} from "../src/errors";
import type { PrayerName, PrayerStatus } from "../src/models";
import { makeHarness } from "./helpers";

const TODAY = "2026-11-10";
const YESTERDAY = "2026-11-09";
const NOON = "2026-11-10T14:00:00+06:00"; // 14:00 Dhaka

describe("ensureDay and T1 (first launch at 14:00)", () => {
  it("creates no Fajr row and a pending Dhuhr row (BR-009)", async () => {
    const { service, repo } = makeHarness(NOON, {
      tracking_started_at: "2026-11-10T08:00:00.000Z", // 14:00 Dhaka
    });
    const entries = await service.ensureDay(TODAY);
    expect(entries.map((e) => e.prayer)).toEqual([
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ]);
    const fajr = await repo.getEntry(TODAY, "fajr");
    expect(fajr).toBeNull();
    const dhuhr = await repo.getEntry(TODAY, "dhuhr");
    expect(dhuhr?.status).toBe("pending");
    expect(dhuhr?.window_start).toBe("2026-11-10T05:43:00.000Z");
    expect(dhuhr?.window_end).toBe("2026-11-10T09:39:00.000Z");
    expect(dhuhr?.source).toBe("auto");
  });

  it("is idempotent: a second call creates nothing", async () => {
    const { service } = makeHarness(NOON);
    const first = await service.ensureDay(TODAY);
    const second = await service.ensureDay(TODAY);
    expect(second).toEqual(first);
    expect(first).toHaveLength(5);
  });

  it("creates all five rows for a past date", async () => {
    const { service } = makeHarness(NOON);
    const entries = await service.ensureDay(YESTERDAY);
    expect(entries).toHaveLength(5);
    expect(entries.every((e) => e.status === "pending")).toBe(true);
  });

  it("throws PrayerTimeError with no location", async () => {
    const { service } = makeHarness(NOON, { location: null });
    await expect(service.ensureDay(TODAY)).rejects.toThrow(PrayerTimeError);
  });
});

describe("answer (T2, T3, BR-003, BR-008)", () => {
  it("T2: one status change, one event, source manual", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.ensureDay(TODAY);
    const result = await service.answer(TODAY, "dhuhr", "prayed");
    expect(result.changed).toBe(true);
    expect(result.entry.status).toBe("on_time");
    expect(result.entry.source).toBe("manual");
    expect(result.event?.type).toBe("MARKED_ON_TIME");
    expect(result.event?.from_status).toBe("pending");
    expect(result.event?.to_status).toBe("on_time");
    const events = await repo.getEventsForEntry(result.entry.id);
    expect(events).toHaveLength(1);
  });

  it("T3: the same response twice changes nothing the second time", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.ensureDay(TODAY);
    await service.answer(TODAY, "dhuhr", "prayed");
    const second = await service.answer(TODAY, "dhuhr", "prayed");
    expect(second.changed).toBe(false);
    expect(second.event).toBeNull();
    expect(second.entry.status).toBe("on_time");
    const events = await repo.getEventsForEntry(second.entry.id);
    expect(events).toHaveLength(1);
  });

  it("answering Not prayed writes qaza, and a later answer is ignored (BR-008)", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.ensureDay(TODAY);
    const first = await service.answer(TODAY, "dhuhr", "not_prayed");
    expect(first.entry.status).toBe("qaza");
    expect(first.event?.type).toBe("MARKED_QAZA");
    const second = await service.answer(TODAY, "dhuhr", "prayed");
    expect(second.changed).toBe(false);
    expect(second.entry.status).toBe("qaza");
    expect(
      (await repo.getEventsForEntry(first.entry.id)).length,
    ).toBe(1);
  });

  it("BR-003: answering a future window throws NotStartedError", async () => {
    const { service } = makeHarness("2026-11-10T10:00:00+06:00");
    await service.ensureDay(TODAY);
    await expect(service.answer(TODAY, "dhuhr", "prayed")).rejects.toThrow(
      NotStartedError,
    );
    await expect(service.answer(TODAY, "asr", "not_prayed")).rejects.toThrow(
      NotStartedError,
    );
    // Fajr's window has started, so it can be answered.
    const fajr = await service.answer(TODAY, "fajr", "prayed");
    expect(fajr.changed).toBe(true);
  });

  it("answering with no row creates a back-dated entry (null windows, manual)", async () => {
    const { service } = makeHarness(NOON);
    const result = await service.answer("2026-11-05", "fajr", "prayed");
    expect(result.changed).toBe(true);
    expect(result.entry.status).toBe("on_time");
    expect(result.entry.window_start).toBeNull();
    expect(result.entry.window_end).toBeNull();
    expect(result.entry.source).toBe("manual");
    expect(result.event?.type).toBe("MARKED_ON_TIME");
    expect(result.event?.from_status).toBeNull();
  });

  it("answering a future date with no row throws NotStartedError", async () => {
    const { service } = makeHarness(NOON);
    await expect(service.answer("2026-11-11", "fajr", "prayed")).rejects.toThrow(
      NotStartedError,
    );
  });

  it("answering a pending entry with null windows is allowed", async () => {
    const { service, repo } = makeHarness(NOON);
    await repo.transaction(async (tx) => {
      await tx.insertEntry({
        id: "00000000-0000-4000-8000-000000000001",
        prayer_date: TODAY,
        prayer: "fajr",
        status: "pending",
        source: "auto",
        window_start: null,
        window_end: null,
        timezone: "Asia/Dhaka",
        latitude: null,
        longitude: null,
        calculation_method: "Karachi",
        madhab: "hanafi",
        created_at: "2026-11-10T08:00:00.000Z",
        updated_at: "2026-11-10T08:00:00.000Z",
      });
    });
    const result = await service.answer(TODAY, "fajr", "prayed");
    expect(result.changed).toBe(true);
    expect(result.entry.status).toBe("on_time");
  });
});

describe("setStatus: valid transitions (spec §4.3)", () => {
  it("(no row) -> on_time and (no row) -> qaza", async () => {
    const { service } = makeHarness(NOON);
    const a = await service.setStatus("2026-11-05", "fajr", "on_time");
    expect(a.entry.status).toBe("on_time");
    expect(a.event?.type).toBe("MARKED_ON_TIME");
    expect(a.entry.window_start).toBeNull();
    const b = await service.setStatus("2026-11-05", "dhuhr", "qaza");
    expect(b.entry.status).toBe("qaza");
    expect(b.event?.type).toBe("MARKED_QAZA");
  });

  it("pending -> on_time and pending -> qaza", async () => {
    const { service } = makeHarness(NOON);
    await service.ensureDay(YESTERDAY);
    const a = await service.setStatus(YESTERDAY, "fajr", "on_time");
    expect(a.event?.type).toBe("MARKED_ON_TIME");
    const b = await service.setStatus(YESTERDAY, "dhuhr", "qaza");
    expect(b.event?.type).toBe("MARKED_QAZA");
    expect(b.entry.source).toBe("manual");
  });

  it("pending -> qaza via setStatus is allowed even before the window starts (table-literal)", async () => {
    // The transition table annotates BR-003 only on pending -> on_time;
    // day-detail rows for not-started prayers are disabled in the UI.
    const { service } = makeHarness("2026-11-10T10:00:00+06:00");
    await service.ensureDay(TODAY);
    const result = await service.setStatus(TODAY, "dhuhr", "qaza");
    expect(result.changed).toBe(true);
    expect(result.entry.status).toBe("qaza");
  });

  it("qaza -> settled via setStatus and via settle", async () => {
    const { service } = makeHarness(NOON);
    await service.setStatus("2026-11-05", "fajr", "qaza");
    const a = await service.setStatus("2026-11-05", "fajr", "settled");
    expect(a.event?.type).toBe("SETTLED");
    await service.setStatus("2026-11-05", "dhuhr", "qaza");
    const b = await service.settle("2026-11-05", "dhuhr");
    expect(b.entry.status).toBe("settled");
    expect(b.event?.type).toBe("SETTLED");
  });

  it("on_time -> qaza and qaza -> on_time are CORRECTED", async () => {
    const { service } = makeHarness(NOON);
    await service.setStatus("2026-11-05", "fajr", "on_time");
    const a = await service.setStatus("2026-11-05", "fajr", "qaza");
    expect(a.event?.type).toBe("CORRECTED");
    expect(a.event?.from_status).toBe("on_time");
    const b = await service.setStatus("2026-11-05", "fajr", "on_time");
    expect(b.event?.type).toBe("CORRECTED");
    expect(b.event?.from_status).toBe("qaza");
  });

  it("settled -> qaza is CORRECTED (undo settle)", async () => {
    const { service } = makeHarness(NOON);
    await service.setStatus("2026-11-05", "fajr", "qaza");
    await service.settle("2026-11-05", "fajr");
    const result = await service.setStatus("2026-11-05", "fajr", "qaza");
    expect(result.entry.status).toBe("qaza");
    expect(result.event?.type).toBe("CORRECTED");
    expect(result.event?.from_status).toBe("settled");
  });

  it("undo restores the previous status, including pending, with CORRECTED", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.ensureDay(YESTERDAY);
    await service.answer(YESTERDAY, "fajr", "prayed");
    const undone = await service.setStatus(YESTERDAY, "fajr", "on_time", {
      undo: true,
      previousStatus: "pending",
    });
    expect(undone.entry.status).toBe("pending");
    expect(undone.event?.type).toBe("CORRECTED");
    const events = await repo.getEventsForEntry(undone.entry.id);
    expect(events.map((e) => e.type)).toEqual([
      "MARKED_ON_TIME",
      "CORRECTED",
    ]);
    // Undo of a settle restores qaza.
    await service.setStatus("2026-11-05", "dhuhr", "qaza");
    await service.settle("2026-11-05", "dhuhr");
    const undoneSettle = await service.setStatus(
      "2026-11-05",
      "dhuhr",
      "settled",
      { undo: true, previousStatus: "qaza" },
    );
    expect(undoneSettle.entry.status).toBe("qaza");
  });

  it("undo to the current status is a no-op", async () => {
    const { service } = makeHarness(NOON);
    await service.setStatus("2026-11-05", "fajr", "qaza");
    const result = await service.setStatus("2026-11-05", "fajr", "qaza", {
      undo: true,
      previousStatus: "qaza",
    });
    expect(result.changed).toBe(false);
    expect(result.event).toBeNull();
  });

  it("undo without previousStatus throws ValidationError", async () => {
    const { service } = makeHarness(NOON);
    await service.setStatus("2026-11-05", "fajr", "qaza");
    await expect(
      service.setStatus("2026-11-05", "fajr", "qaza", { undo: true }),
    ).rejects.toThrow(ValidationError);
  });

  it("undo with no entry throws InvalidTransitionError", async () => {
    const { service } = makeHarness(NOON);
    await expect(
      service.setStatus("2026-11-05", "fajr", "qaza", {
        undo: true,
        previousStatus: "pending",
      }),
    ).rejects.toThrow(InvalidTransitionError);
  });
});

describe("setStatus / settle: invalid transitions (spec §4.3)", () => {
  async function entryIn(state: PrayerStatus, date = YESTERDAY) {
    const h = makeHarness(NOON);
    if (state === "pending") {
      await h.service.ensureDay(date);
    } else if (state === "on_time") {
      await h.service.ensureDay(date);
      await h.service.answer(date, "fajr", "prayed");
    } else if (state === "qaza") {
      await h.service.ensureDay(date);
      await h.service.answer(date, "fajr", "not_prayed");
    } else {
      await h.service.ensureDay(date);
      await h.service.answer(date, "fajr", "not_prayed");
      await h.service.settle(date, "fajr");
    }
    return h;
  }

  it.each([
    ["pending", "settled"],
    ["pending", "pending"],
    ["on_time", "settled"],
    ["on_time", "on_time"],
    ["on_time", "pending"],
    ["qaza", "qaza"],
    ["qaza", "pending"],
    ["settled", "settled"],
    ["settled", "on_time"],
    ["settled", "pending"],
  ])("%s -> %s is rejected", async (from, to) => {
    const h = await entryIn(from as PrayerStatus);
    await expect(
      h.service.setStatus(YESTERDAY, "fajr", to as PrayerStatus),
    ).rejects.toThrow(InvalidTransitionError);
  });

  it("(no row) -> settled and (no row) -> pending are rejected", async () => {
    const { service } = makeHarness(NOON);
    await expect(
      service.setStatus("2026-11-05", "fajr", "settled"),
    ).rejects.toThrow(InvalidTransitionError);
    await expect(
      service.setStatus("2026-11-05", "fajr", "pending"),
    ).rejects.toThrow(InvalidTransitionError);
  });

  it("(no row) -> on_time for a future window throws NotStartedError", async () => {
    const { service } = makeHarness(NOON);
    await expect(
      service.setStatus("2026-11-11", "fajr", "on_time"),
    ).rejects.toThrow(NotStartedError);
  });

  it("pending -> on_time for a future window throws NotStartedError", async () => {
    const { service } = makeHarness("2026-11-10T10:00:00+06:00");
    await service.ensureDay(TODAY);
    await expect(
      service.setStatus(TODAY, "dhuhr", "on_time"),
    ).rejects.toThrow(NotStartedError);
  });

  it("settle rejects pending, on_time, settled and missing rows", async () => {
    const { service } = makeHarness(NOON);
    await service.ensureDay(YESTERDAY);
    await expect(service.settle(YESTERDAY, "fajr")).rejects.toThrow(
      InvalidTransitionError,
    );
    await service.answer(YESTERDAY, "fajr", "prayed");
    await expect(service.settle(YESTERDAY, "fajr")).rejects.toThrow(
      InvalidTransitionError,
    );
    await service.answer(YESTERDAY, "dhuhr", "not_prayed");
    await service.settle(YESTERDAY, "dhuhr");
    await expect(service.settle(YESTERDAY, "dhuhr")).rejects.toThrow(
      InvalidTransitionError,
    );
    await expect(service.settle("2026-11-05", "fajr")).rejects.toThrow(
      InvalidTransitionError,
    );
  });
});

describe("markAutoQaza", () => {
  it("pending -> qaza with AUTO_QAZA and source auto", async () => {
    const { service } = makeHarness(NOON);
    await service.ensureDay(YESTERDAY);
    const result = await service.markAutoQaza(YESTERDAY, "fajr");
    expect(result.changed).toBe(true);
    expect(result.entry.status).toBe("qaza");
    expect(result.entry.source).toBe("auto");
    expect(result.event?.type).toBe("AUTO_QAZA");
  });

  it("is a no-op when no longer pending, and throws with no entry", async () => {
    const { service } = makeHarness(NOON);
    await service.ensureDay(YESTERDAY);
    await service.answer(YESTERDAY, "fajr", "prayed");
    const again = await service.markAutoQaza(YESTERDAY, "fajr");
    expect(again.changed).toBe(false);
    await expect(
      service.markAutoQaza("2026-11-05", "fajr"),
    ).rejects.toThrow(InvalidTransitionError);
  });
});

describe("addQazaRange (T9)", () => {
  it("adds 365 days once, then skips all 365 the second time", async () => {
    const { service, repo } = makeHarness(NOON);
    const progress: Array<{ created: number; skipped: number; total: number }> =
      [];
    const first = await service.addQazaRange(
      "2025-11-10",
      "2026-11-09",
      ["fajr"],
      (p) => progress.push(p),
    );
    expect(first).toEqual({ created: 365, skipped: 0 });
    expect(progress).toEqual([{ created: 365, skipped: 0, total: 365 }]);
    const second = await service.addQazaRange("2025-11-10", "2026-11-09", [
      "fajr",
    ]);
    expect(second).toEqual({ created: 0, skipped: 365 });
    const rows = await repo.qazaByPrayer("fajr");
    expect(rows).toHaveLength(365);
    expect(rows[0]?.prayer_date).toBe("2025-11-10");
    expect(rows[364]?.prayer_date).toBe("2026-11-09");
    expect(rows.every((r) => r.source === "manual")).toBe(true);
    expect(rows.every((r) => r.window_start === null)).toBe(true);
    const events = await repo.getEventsForEntry(rows[0]?.id ?? "");
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("MARKED_QAZA");
  });

  it("skips rows with other statuses and counts them", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.setStatus("2026-11-05", "fajr", "on_time");
    const result = await service.addQazaRange("2026-11-01", "2026-11-09", [
      "fajr",
    ]);
    expect(result).toEqual({ created: 8, skipped: 1 });
    const kept = await repo.getEntry("2026-11-05", "fajr");
    expect(kept?.status).toBe("on_time");
  });

  it("chunks by 500 days and reports progress per chunk", async () => {
    const { service } = makeHarness(NOON);
    const progress: Array<{ created: number; skipped: number; total: number }> =
      [];
    const result = await service.addQazaRange(
      "2025-01-01",
      "2026-11-09",
      ["fajr"],
      (p) => progress.push(p),
    );
    expect(result).toEqual({ created: 678, skipped: 0 });
    expect(progress).toHaveLength(2);
    expect(progress[0]).toEqual({ created: 500, skipped: 0, total: 678 });
    expect(progress[1]).toEqual({ created: 678, skipped: 0, total: 678 });
  });

  it("rejects dates before MIN_BACKDATE, after yesterday, bad spans and bad input", async () => {
    const { service } = makeHarness(NOON);
    await expect(
      service.addQazaRange("1989-12-31", "2026-11-09", ["fajr"]),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.addQazaRange("2026-11-01", "2026-11-10", ["fajr"]),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.addQazaRange("2026-11-09", "2026-11-01", ["fajr"]),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.addQazaRange("1990-01-01", "2010-01-02", ["fajr"]),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.addQazaRange("2026-11-01", "2026-11-09", []),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.addQazaRange("2026-13-01", "2026-11-09", ["fajr"]),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.addQazaRange(
        "2026-11-01",
        "2026-11-09",
        ["fajr", "nope" as PrayerName],
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("accepts MIN_BACKDATE and a span of exactly 7305 days", async () => {
    const { service } = makeHarness(NOON);
    // 1990-01-01..2009-12-31 is 7305 days inclusive.
    const result = await service.addQazaRange("1990-01-01", "2009-12-31", [
      "fajr",
    ]);
    expect(result).toEqual({ created: 7305, skipped: 0 });
  });
});

describe("rewriteOpenWindows (T6, BR-006)", () => {
  it("at 10:00 only open pending entries are rewritten", async () => {
    const { service, repo, provider } = makeHarness(
      "2026-11-10T10:00:00+06:00",
    );
    await service.ensureDay(TODAY);
    await service.ensureDay(YESTERDAY);
    // Fajr is answered, so it must keep its recorded times.
    await service.answer(TODAY, "fajr", "prayed");
    // Change method + madhab, as in Settings.
    provider.settings = {
      ...provider.settings,
      method: "MuslimWorldLeague",
      madhab: "shafi",
    };
    const rewritten = await service.rewriteOpenWindows();
    expect(rewritten).toBe(4);

    const fajr = await repo.getEntry(TODAY, "fajr");
    expect(fajr?.window_start).toBe("2026-11-09T22:52:00.000Z"); // unchanged
    expect(fajr?.calculation_method).toBe("Karachi");
    const asr = await repo.getEntry(TODAY, "asr");
    expect(asr?.window_start).toBe("2026-11-10T08:52:00.000Z"); // 14:52 MWL/Shafi
    expect(asr?.calculation_method).toBe("MuslimWorldLeague");
    expect(asr?.madhab).toBe("shafi");
    const dhuhr = await repo.getEntry(TODAY, "dhuhr");
    expect(dhuhr?.window_start).toBe("2026-11-10T05:43:00.000Z");
    // Yesterday's pending rows are past: untouched.
    const oldFajr = await repo.getEntry(YESTERDAY, "fajr");
    expect(oldFajr?.window_start).toBe("2026-11-08T22:51:00.000Z"); // 04:51 on 11-09
    expect(oldFajr?.calculation_method).toBe("Karachi");
  });

  it("rewrites nothing when there is nothing open", async () => {
    const { service } = makeHarness(NOON);
    expect(await service.rewriteOpenWindows()).toBe(0);
  });

  it("skips pending entries with null windows", async () => {
    const { service, repo } = makeHarness(NOON);
    await repo.transaction(async (tx) => {
      await tx.insertEntry({
        id: "00000000-0000-4000-8000-000000000002",
        prayer_date: TODAY,
        prayer: "fajr",
        status: "pending",
        source: "auto",
        window_start: null,
        window_end: null,
        timezone: "Asia/Dhaka",
        latitude: null,
        longitude: null,
        calculation_method: "Karachi",
        madhab: "hanafi",
        created_at: "2026-11-10T08:00:00.000Z",
        updated_at: "2026-11-10T08:00:00.000Z",
      });
    });
    expect(await service.rewriteOpenWindows()).toBe(0);
  });
});
