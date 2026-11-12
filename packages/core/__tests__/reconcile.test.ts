import { reconcile } from "../src/reconcile";
import { makeHarness } from "./helpers";

const NOON = "2026-11-10T14:00:00+06:00"; // 14:00 Dhaka

describe("reconcile (spec §5.5)", () => {
  it("T4: at exactly window_end + 180 min a pending entry becomes qaza; 1 min before it stays", async () => {
    const h = makeHarness("2026-11-10T09:09:00+06:00", {
      tracking_started_at: "2026-11-10T00:00:00.000Z",
    });
    // Fajr window ends 06:10; +180 min = 09:10.
    const first = await h.service.reconcile();
    expect(first).toEqual({ created: 5, autoQaza: 0 });
    expect((await h.repo.getEntry("2026-11-10", "fajr"))?.status).toBe(
      "pending",
    );

    h.clock.set("2026-11-10T09:10:00+06:00");
    const second = await h.service.reconcile();
    expect(second).toEqual({ created: 0, autoQaza: 1 });
    const fajr = await h.repo.getEntry("2026-11-10", "fajr");
    expect(fajr?.status).toBe("qaza");
    expect(fajr?.source).toBe("auto");
    const events = await h.repo.getEventsForEntry(fajr?.id ?? "");
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("AUTO_QAZA");

    // Running reconcile again at the same instant creates nothing.
    const third = await h.service.reconcile();
    expect(third).toEqual({ created: 0, autoQaza: 0 });
  });

  it("T5: after 10 days away only the last 3 days are materialised", async () => {
    const { service, repo } = makeHarness(NOON, {
      tracking_started_at: "2026-10-01T00:00:00.000Z",
    });
    const report = await service.reconcile();
    expect(report.created).toBe(20); // 2026-11-07..2026-11-10, 5 each
    expect(report.autoQaza).toBe(16);
    expect(await repo.getEntriesForDate("2026-11-06")).toEqual([]);
    expect(await repo.getEntriesForDate("2026-11-07")).toHaveLength(5);
    expect(await repo.getEntriesForDate("2026-11-10")).toHaveLength(5);
    // Today's Dhuhr window has not ended yet, so it stays pending.
    expect((await repo.getEntry("2026-11-10", "dhuhr"))?.status).toBe(
      "pending",
    );
    expect((await repo.getEntry("2026-11-10", "fajr"))?.status).toBe("qaza");
    // A second run creates nothing.
    const again = await service.reconcile();
    expect(again).toEqual({ created: 0, autoQaza: 0 });
  });

  it("never creates entries for windows ending before tracking_started_at (BR-009)", async () => {
    const { service, repo } = makeHarness(NOON, {
      tracking_started_at: "2026-11-10T08:00:00.000Z", // 14:00 Dhaka
    });
    const report = await service.reconcile();
    expect(report.created).toBe(4); // today only, no Fajr
    expect(await repo.getEntry("2026-11-10", "fajr")).toBeNull();
  });

  it("standalone reconcile() counts only auto-qaza calls that changed something", async () => {
    const { repo, clock, provider, service } = makeHarness(NOON, {
      tracking_started_at: "2026-11-10T00:00:00.000Z",
    });
    await service.ensureDay("2026-11-10");
    const fajr = await repo.getEntry("2026-11-10", "fajr");
    const stubService = {
      ensureDay: (date: string) => service.ensureDay(date),
      markAutoQaza: async () => ({
        ok: true as const,
        changed: false,
        entry: fajr ?? {
          id: "missing",
          prayer_date: "2026-11-10",
          prayer: "fajr" as const,
          status: "pending" as const,
          source: "auto" as const,
          window_start: null,
          window_end: null,
          timezone: "Asia/Dhaka",
          latitude: null,
          longitude: null,
          calculation_method: "Karachi" as const,
          madhab: "hanafi" as const,
          created_at: "2026-11-10T08:00:00.000Z",
          updated_at: "2026-11-10T08:00:00.000Z",
        },
        event: null,
      }),
    };
    const report = await reconcile(
      { repo, clock, settingsProvider: provider, service: stubService },
      clock.now(),
    );
    expect(report.autoQaza).toBe(0);
    expect((await repo.getEntry("2026-11-10", "fajr"))?.status).toBe(
      "pending",
    );
  });
});
