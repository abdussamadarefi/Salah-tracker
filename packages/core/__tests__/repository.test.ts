import type {
  PrayerLogEntry,
  PrayerName,
  PrayerStatus,
} from "../src/models";
import { InMemoryRepository } from "../src/testing/inMemoryRepository";

function makeEntry(
  date: string,
  prayer: PrayerName,
  status: PrayerStatus,
  overrides: Partial<PrayerLogEntry> = {},
): PrayerLogEntry {
  return {
    id: `${date}-${prayer}-id`,
    prayer_date: date,
    prayer,
    status,
    source: "manual",
    window_start: null,
    window_end: null,
    timezone: "Asia/Dhaka",
    latitude: 23.8103,
    longitude: 90.4125,
    calculation_method: "Karachi",
    madhab: "hanafi",
    created_at: "2026-11-10T08:00:00.000Z",
    updated_at: "2026-11-10T08:00:00.000Z",
    ...overrides,
  };
}

describe("InMemoryRepository", () => {
  it("inserts, reads and lists entries in prayer order", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-10", "isha", "pending"));
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "pending"));
      await tx.insertEntry(makeEntry("2026-11-10", "dhuhr", "pending"));
    });
    const entries = await repo.getEntriesForDate("2026-11-10");
    expect(entries.map((e) => e.prayer)).toEqual(["fajr", "dhuhr", "isha"]);
    const one = await repo.getEntry("2026-11-10", "fajr");
    expect(one?.status).toBe("pending");
    expect(await repo.getEntry("2026-11-10", "asr")).toBeNull();
  });

  it("rolls back entries, events and settings when a transaction throws", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "pending"));
    });
    await expect(
      repo.transaction(async (tx) => {
        await tx.insertEntry(makeEntry("2026-11-10", "dhuhr", "pending"));
        await tx.insertEvent({
          id: "event-1",
          prayer_log_id: "2026-11-10-fajr-id",
          type: "MARKED_ON_TIME",
          from_status: "pending",
          to_status: "on_time",
          created_at: "2026-11-10T08:00:00.000Z",
        });
        await tx.setSetting("theme", "dark");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await repo.getEntry("2026-11-10", "dhuhr")).toBeNull();
    expect(await repo.getEventsForEntry("2026-11-10-fajr-id")).toEqual([]);
    expect(await repo.getSetting("theme")).toBeNull();
    // The earlier committed row survives.
    expect(await repo.getEntry("2026-11-10", "fajr")).not.toBeNull();
  });

  it("rejects a duplicate (date, prayer) insert", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "pending"));
    });
    await expect(
      repo.transaction(async (tx) => {
        await tx.insertEntry(makeEntry("2026-11-10", "fajr", "pending"));
      }),
    ).rejects.toThrow("duplicate");
  });

  it("rejects updating a missing entry", async () => {
    const repo = new InMemoryRepository();
    await expect(
      repo.transaction(async (tx) => {
        await tx.updateEntry(makeEntry("2026-11-10", "fajr", "pending"));
      }),
    ).rejects.toThrow("no prayer_log entry");
  });

  it("getEntriesInRange filters by date and sorts", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-08", "fajr", "qaza"));
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "qaza"));
      await tx.insertEntry(makeEntry("2026-11-12", "fajr", "qaza"));
    });
    const range = await repo.getEntriesInRange("2026-11-08", "2026-11-10");
    expect(range.map((e) => e.prayer_date)).toEqual([
      "2026-11-08",
      "2026-11-10",
    ]);
  });

  it("qazaCounts, qazaByPrayer and oldestQaza order by date then prayer", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-09", "asr", "qaza"));
      await tx.insertEntry(makeEntry("2026-11-09", "fajr", "qaza"));
      await tx.insertEntry(makeEntry("2026-11-08", "isha", "qaza"));
      await tx.insertEntry(makeEntry("2026-11-08", "fajr", "on_time"));
      await tx.insertEntry(makeEntry("2026-11-10", "dhuhr", "pending"));
    });
    expect(await repo.qazaCounts()).toEqual({
      fajr: 1,
      dhuhr: 0,
      asr: 1,
      maghrib: 0,
      isha: 1,
    });
    expect(
      (await repo.qazaByPrayer("fajr")).map((e) => e.prayer_date),
    ).toEqual(["2026-11-09"]);
    const oldest = await repo.oldestQaza();
    expect(oldest?.prayer_date).toBe("2026-11-08");
    expect(oldest?.prayer).toBe("isha");
    // Only the earliest date's earliest prayer is oldest; 11-09 fajr
    // comes before 11-09 asr.
    const repo2 = new InMemoryRepository();
    await repo2.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-09", "asr", "qaza"));
      await tx.insertEntry(makeEntry("2026-11-09", "fajr", "qaza"));
    });
    expect((await repo2.oldestQaza())?.prayer).toBe("fajr");
  });

  it("oldestQaza is null when there is no qaza", async () => {
    const repo = new InMemoryRepository();
    expect(await repo.oldestQaza()).toBeNull();
  });

  it("completeDays needs all five on_time", async () => {
    const repo = new InMemoryRepository();
    const prayers: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    await repo.transaction(async (tx) => {
      for (const p of prayers) {
        await tx.insertEntry(makeEntry("2026-11-09", p, "on_time"));
      }
      for (const p of prayers.slice(0, 4)) {
        await tx.insertEntry(makeEntry("2026-11-08", p, "on_time"));
      }
      await tx.insertEntry(makeEntry("2026-11-08", "isha", "settled"));
    });
    expect(await repo.completeDays()).toEqual(["2026-11-09"]);
  });

  it("settledSince counts SETTLED events at or after the instant", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-09", "fajr", "qaza"));
      await tx.insertEvent({
        id: "e1",
        prayer_log_id: "2026-11-09-fajr-id",
        type: "SETTLED",
        from_status: "qaza",
        to_status: "settled",
        created_at: "2026-11-03T14:00:00.000Z",
      });
      await tx.insertEvent({
        id: "e2",
        prayer_log_id: "2026-11-09-fajr-id",
        type: "SETTLED",
        from_status: "qaza",
        to_status: "settled",
        created_at: "2026-11-02T14:00:00.000Z",
      });
      await tx.insertEvent({
        id: "e3",
        prayer_log_id: "2026-11-09-fajr-id",
        type: "MARKED_QAZA",
        from_status: null,
        to_status: "qaza",
        created_at: "2026-11-09T14:00:00.000Z",
      });
    });
    expect(await repo.settledSince("2026-11-03T14:00:00.000Z")).toBe(1);
    expect(await repo.settledSince("2026-11-01T00:00:00.000Z")).toBe(2);
  });

  it("listPendingOpen returns only pending rows", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "pending"));
      await tx.insertEntry(makeEntry("2026-11-10", "dhuhr", "on_time"));
      await tx.insertEntry(makeEntry("2026-11-09", "asr", "pending"));
    });
    const pending = await repo.listPendingOpen();
    expect(pending.map((e) => `${e.prayer_date}:${e.prayer}`)).toEqual([
      "2026-11-09:asr",
      "2026-11-10:fajr",
    ]);
  });

  it("settings round-trip and deleteAll clears everything", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "pending"));
      await tx.setSetting("theme", "dark");
    });
    expect(await repo.getSetting<string>("theme")).toBe("dark");
    expect(await repo.getSetting<string>("missing")).toBeNull();
    await repo.transaction(async (tx) => {
      await tx.deleteAll();
    });
    expect(await repo.getEntriesForDate("2026-11-10")).toEqual([]);
    expect(await repo.getSetting<string>("theme")).toBeNull();
  });

  it("exportAll then replaceAll restores identical data", async () => {
    const repo = new InMemoryRepository();
    await repo.transaction(async (tx) => {
      await tx.insertEntry(makeEntry("2026-11-10", "fajr", "qaza"));
      await tx.insertEvent({
        id: "e1",
        prayer_log_id: "2026-11-10-fajr-id",
        type: "MARKED_QAZA",
        from_status: null,
        to_status: "qaza",
        created_at: "2026-11-10T08:00:00.000Z",
      });
      await tx.setSetting("theme", "dark");
    });
    const backup = await repo.exportAll();
    const fresh = new InMemoryRepository();
    await fresh.transaction(async (tx) => {
      await tx.replaceAll(backup);
    });
    const reExport = await fresh.exportAll();
    expect(reExport.prayer_logs).toEqual(backup.prayer_logs);
    expect(reExport.prayer_events).toEqual(backup.prayer_events);
    expect(reExport.settings).toEqual(backup.settings);
  });
});
