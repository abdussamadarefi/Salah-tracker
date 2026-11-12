import type { Planned, PlannedCheckin } from "../src/planner";
import { diffPlan, planNotifications } from "../src/planner";
import { dhakaSettings } from "./helpers";

const SETTINGS = dhakaSettings();

describe("planNotifications (T13)", () => {
  it("iOS 7-day plan at 14:00 has at most 36 items and a sentinel", () => {
    const now = new Date("2026-11-10T14:00:00+06:00");
    const plan = planNotifications(now, SETTINGS, 7, new Set());
    expect(plan.length).toBeLessThanOrEqual(36);
    // 4 left today (dhuhr, asr, maghrib, isha) + 6 days x 5 + sentinel = 35.
    expect(plan.length).toBe(35);
    const sentinel = plan.find((p) => p.id === "sentinel");
    expect(sentinel).toBeDefined();
    // Last check-in is 2026-11-16 isha, ending 2026-11-17 04:56 Dhaka.
    expect(sentinel?.fireAt).toBe("2026-11-16T23:06:00.000Z");
    const ids = plan.map((p) => p.id);
    expect(ids).toContain("checkin:2026-11-10:dhuhr");
    expect(ids).toContain("checkin:2026-11-10:asr");
    expect(ids).not.toContain("checkin:2026-11-10:fajr");
  });

  it("marks isha check-ins quiet and the rest loud", () => {
    const now = new Date("2026-11-10T14:00:00+06:00");
    const plan = planNotifications(now, SETTINGS, 7, new Set());
    for (const p of plan) {
      if (!("quiet" in p)) {
        continue;
      }
      expect(p.quiet).toBe(p.prayer === "isha");
    }
  });

  it("skips answered keys", () => {
    const now = new Date("2026-11-10T14:00:00+06:00");
    const answered = new Set([
      "checkin:2026-11-10:asr",
      "checkin:2026-11-12:isha",
    ]);
    const plan = planNotifications(now, SETTINGS, 7, answered);
    const ids = plan.map((p) => p.id);
    expect(ids).not.toContain("checkin:2026-11-10:asr");
    expect(ids).not.toContain("checkin:2026-11-12:isha");
    expect(plan.length).toBe(33);
  });

  it("includes yesterday's Isha while it is still open (01:00)", () => {
    const now = new Date("2026-11-10T01:00:00+06:00");
    const plan = planNotifications(now, SETTINGS, 7, new Set());
    const ids = plan.map((p) => p.id);
    expect(ids).toContain("checkin:2026-11-09:isha");
    expect(ids).toContain("checkin:2026-11-10:fajr");
  });

  it("skips a check-in firing within 5 seconds, keeps one 6 seconds out", () => {
    // Asr ends 17:15:00. At 17:14:57 it is 3 s away (skip); at 17:14:54
    // it is 6 s away (keep). Horizon 1 keeps the plan small.
    const late = new Date("2026-11-10T17:14:57+06:00");
    const latePlan = planNotifications(late, SETTINGS, 1, new Set());
    expect(latePlan.map((p) => p.id)).not.toContain(
      "checkin:2026-11-10:asr",
    );
    const early = new Date("2026-11-10T17:14:54+06:00");
    const earlyPlan = planNotifications(early, SETTINGS, 1, new Set());
    expect(earlyPlan.map((p) => p.id)).toContain("checkin:2026-11-10:asr");
  });

  it("returns an empty plan (no sentinel) when everything is answered", () => {
    const now = new Date("2026-11-10T14:00:00+06:00");
    const full = planNotifications(now, SETTINGS, 7, new Set());
    const answered = new Set(full.map((p) => p.id));
    expect(planNotifications(now, SETTINGS, 7, answered)).toEqual([]);
  });

  it("Android 14-day horizon covers today + 13 days", () => {
    const now = new Date("2026-11-10T14:00:00+06:00");
    const plan = planNotifications(now, SETTINGS, 14, new Set());
    const dates = new Set(
      plan
        .filter((p): p is PlannedCheckin => "date" in p)
        .map((p) => p.date),
    );
    expect(dates.has("2026-11-23")).toBe(true);
    expect(dates.has("2026-11-24")).toBe(false);
  });
});

describe("diffPlan", () => {
  function samplePlan(): Planned[] {
    const now = new Date("2026-11-10T14:00:00+06:00");
    return planNotifications(now, SETTINGS, 1, new Set());
  }

  it("with an id list: cancels stale ids, schedules missing ones", () => {
    const plan = samplePlan();
    const existing = ["checkin:2026-11-10:asr", "stale-id"];
    const diff = diffPlan(plan, existing);
    expect(diff.toCancel).toEqual(["stale-id"]);
    expect(diff.toSchedule.map((p) => p.id)).toEqual(
      plan.map((p) => p.id).filter((id) => id !== "checkin:2026-11-10:asr"),
    );
  });

  it("with a Map: unchanged triggers produce an empty diff", () => {
    const plan = samplePlan();
    const existing = new Map(plan.map((p) => [p.id, p.fireAt]));
    expect(diffPlan(plan, existing)).toEqual({ toCancel: [], toSchedule: [] });
  });

  it("with a Map: a trigger moved > 30 s is cancelled and rescheduled", () => {
    const plan = samplePlan();
    const existing = new Map(plan.map((p) => [p.id, p.fireAt]));
    const asr = plan.find((p) => p.id === "checkin:2026-11-10:asr");
    expect(asr).toBeDefined();
    if (asr !== undefined) {
      existing.set(
        asr.id,
        new Date(new Date(asr.fireAt).getTime() - 60000).toISOString(),
      );
    }
    const diff = diffPlan(plan, existing);
    expect(diff.toCancel).toEqual(["checkin:2026-11-10:asr"]);
    expect(diff.toSchedule.map((p) => p.id)).toEqual([
      "checkin:2026-11-10:asr",
    ]);
  });

  it("with a Map: a trigger moved <= 30 s is unchanged", () => {
    const plan = samplePlan();
    const existing = new Map(plan.map((p) => [p.id, p.fireAt]));
    const asr = plan.find((p) => p.id === "checkin:2026-11-10:asr");
    expect(asr).toBeDefined();
    if (asr !== undefined) {
      existing.set(
        asr.id,
        new Date(new Date(asr.fireAt).getTime() - 20000).toISOString(),
      );
    }
    expect(diffPlan(plan, existing)).toEqual({ toCancel: [], toSchedule: [] });
  });

  it("with a Map: an unparseable stored fire time counts as changed", () => {
    const plan = samplePlan();
    const existing = new Map(plan.map((p) => [p.id, p.fireAt]));
    existing.set("checkin:2026-11-10:asr", "not-a-date");
    const diff = diffPlan(plan, existing);
    expect(diff.toCancel).toContain("checkin:2026-11-10:asr");
    expect(diff.toSchedule.map((p) => p.id)).toContain(
      "checkin:2026-11-10:asr",
    );
  });

  it("with a Map: ids missing from the OS are scheduled, extra ids cancelled", () => {
    const plan = samplePlan();
    const existing = new Map<string, string>();
    existing.set("checkin:2026-11-10:asr", "2026-11-10T11:15:00.000Z");
    existing.set("stale-id", "2026-11-10T11:15:00.000Z");
    const diff = diffPlan(plan, existing);
    expect(diff.toCancel).toEqual(["stale-id"]);
    expect(diff.toSchedule.map((p) => p.id)).toEqual(
      plan.map((p) => p.id).filter((id) => id !== "checkin:2026-11-10:asr"),
    );
  });
});
