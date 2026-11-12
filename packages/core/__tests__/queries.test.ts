import {
  currentStreakFrom,
  getStreaks,
  longestStreakFrom,
  oldestQaza,
  qazaByPrayer,
  qazaCounts,
  recoveredThisWeek,
} from "../src/queries";
import type { PrayerName } from "../src/models";
import { makeHarness } from "./helpers";

const NOON = "2026-11-10T14:00:00+06:00";
const PRAYERS: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

async function completeDay(
  h: ReturnType<typeof makeHarness>,
  date: string,
): Promise<void> {
  for (const p of PRAYERS) {
    await h.service.setStatus(date, p, "on_time");
  }
}

describe("qaza queries", () => {
  it("qazaCounts delegates to the repository", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.addQazaRange("2026-11-08", "2026-11-09", ["fajr", "isha"]);
    expect(await qazaCounts(repo)).toEqual({
      fajr: 2,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 2,
    });
  });

  it("oldestQaza orders by date then prayer order", async () => {
    const { service, repo } = makeHarness(NOON);
    await service.addQazaRange("2026-11-08", "2026-11-09", ["asr"]);
    await service.setStatus("2026-11-09", "fajr", "qaza");
    const oldest = await oldestQaza(repo);
    expect(oldest?.prayer_date).toBe("2026-11-08");
    expect(oldest?.prayer).toBe("asr");
    expect(await qazaByPrayer(repo, "asr")).toHaveLength(2);
    expect(await qazaByPrayer(repo, "fajr")).toHaveLength(1);
    expect(await qazaByPrayer(repo, "dhuhr")).toHaveLength(0);
  });

  it("oldestQaza is null with no qaza", async () => {
    const { repo } = makeHarness(NOON);
    expect(await oldestQaza(repo)).toBeNull();
  });
});

describe("recoveredThisWeek", () => {
  it("counts settles in the last 7 days, including exactly 7 days ago", async () => {
    const h = makeHarness("2026-11-02T14:00:00+06:00");
    await h.service.setStatus("2026-11-01", "fajr", "qaza");
    await h.service.settle("2026-11-01", "fajr"); // 8 days before 11-10
    h.clock.set("2026-11-03T14:00:00+06:00");
    await h.service.setStatus("2026-11-01", "dhuhr", "qaza");
    await h.service.settle("2026-11-01", "dhuhr"); // exactly 7 days before
    h.clock.set("2026-11-10T14:00:00+06:00");
    await h.service.setStatus("2026-11-01", "asr", "qaza");
    await h.service.settle("2026-11-01", "asr"); // today
    const now = new Date("2026-11-10T14:00:00+06:00");
    expect(await recoveredThisWeek(h.repo, now)).toBe(2);
  });
});

describe("streaks (T11, spec §4.5)", () => {
  it("today incomplete does not break the streak", async () => {
    const h = makeHarness(NOON);
    await completeDay(h, "2026-11-07");
    await completeDay(h, "2026-11-08");
    await completeDay(h, "2026-11-09");
    // Today: two on_time (fajr, dhuhr), the rest still pending.
    await h.service.ensureDay("2026-11-10");
    for (const p of PRAYERS.slice(0, 2)) {
      await h.service.answer("2026-11-10", p, "prayed");
    }
    expect(await getStreaks(h.repo, "2026-11-10")).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it("a gap breaks the streak; longest is the longest run", async () => {
    const h = makeHarness(NOON);
    await completeDay(h, "2026-11-05");
    await completeDay(h, "2026-11-06");
    // 2026-11-07: no rows at all.
    await completeDay(h, "2026-11-08");
    await completeDay(h, "2026-11-09");
    expect(await getStreaks(h.repo, "2026-11-10")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  it("settled does not count as on time", async () => {
    const h = makeHarness(NOON);
    await completeDay(h, "2026-11-08");
    for (const p of PRAYERS.slice(0, 4)) {
      await h.service.setStatus("2026-11-09", p, "on_time");
    }
    await h.service.setStatus("2026-11-09", "isha", "qaza");
    await h.service.settle("2026-11-09", "isha");
    // 11-09 is not complete (settled is not on_time), so the current
    // streak is 0 even though 11-08 alone is complete.
    expect(await getStreaks(h.repo, "2026-11-10")).toEqual({
      currentStreak: 0,
      longestStreak: 1,
    });
  });

  it("today complete extends the streak", async () => {
    // 21:00: every window today has started, so today can be completed.
    const h = makeHarness("2026-11-10T21:00:00+06:00");
    await completeDay(h, "2026-11-09");
    await completeDay(h, "2026-11-10");
    expect(await getStreaks(h.repo, "2026-11-10")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  it("no complete days gives zero streaks", async () => {
    const h = makeHarness(NOON);
    expect(await getStreaks(h.repo, "2026-11-10")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it("pure helpers handle unsorted input and single days", () => {
    expect(longestStreakFrom(["2026-11-09", "2026-11-07", "2026-11-08"])).toBe(
      3,
    );
    expect(longestStreakFrom([])).toBe(0);
    expect(currentStreakFrom(["2026-11-10"], "2026-11-10")).toBe(1);
    expect(currentStreakFrom([], "2026-11-10")).toBe(0);
  });
});
