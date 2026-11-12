// Notification planner (spec §5.6). Pure: no I/O, no clock reads beyond
// the `now` passed in. The OS list is the source of truth; diffPlan
// compares a fresh plan against it.
import { addDays, toLocalDate } from "./dates";
import type { IsoUtc, LocalDate, PrayerName, Settings } from "./models";
import { getWindows } from "./windows";

export interface PlannedCheckin {
  id: string; // "checkin:YYYY-MM-DD:prayer"
  fireAt: IsoUtc;
  prayer: PrayerName;
  date: LocalDate;
  /** Isha check-ins are quiet (they land at dawn, §6.2 / O-3). */
  quiet: boolean;
}

export interface PlannedSentinel {
  id: "sentinel";
  fireAt: IsoUtc;
}

export type Planned = PlannedCheckin | PlannedSentinel;

export interface PlanDiff {
  toCancel: string[];
  toSchedule: Planned[];
}

/** A check-in at or within 5 s of now is not scheduled. */
const SKIP_WITHIN_MS = 5000;
/** The sentinel follows the last check-in by 10 minutes. */
const SENTINEL_AFTER_MS = 10 * 60 * 1000;
/** A planned trigger moved by more than 30 s counts as changed. */
const CHANGED_AFTER_MS = 30 * 1000;

export function planNotifications(
  now: Date,
  settings: Settings,
  horizonDays: number,
  answered: Set<string>,
): Planned[] {
  const today = toLocalDate(now);
  const startDate = addDays(today, -1);
  const endDate = addDays(today, horizonDays - 1);
  const checkins: PlannedCheckin[] = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    for (const w of getWindows(d, settings)) {
      const key = `checkin:${d}:${w.prayer}`;
      if (answered.has(key)) {
        continue;
      }
      if (w.end.getTime() - now.getTime() <= SKIP_WITHIN_MS) {
        continue;
      }
      checkins.push({
        id: key,
        fireAt: w.end.toISOString(),
        prayer: w.prayer,
        date: d,
        quiet: w.prayer === "isha",
      });
    }
  }
  const planned: Planned[] = [...checkins];
  if (checkins.length > 0) {
    const lastFire = Math.max(
      ...checkins.map((c) => new Date(c.fireAt).getTime()),
    );
    planned.push({
      id: "sentinel",
      fireAt: new Date(lastFire + SENTINEL_AFTER_MS).toISOString(),
    });
  }
  return planned;
}

/**
 * Compare a fresh plan with what the OS already has scheduled.
 *
 * `existing` is either a Map of id -> fireAt ISO (from
 * getAllScheduledNotificationsAsync, with trigger times) or a plain list
 * of ids. A planned item whose trigger moved by more than 30 s counts as
 * changed: its id is returned in toCancel and the new item in toSchedule.
 * With a plain id list there is nothing to compare times against, so any
 * planned id not in the list is scheduled and any listed id not in the
 * plan is cancelled.
 */
export function diffPlan(
  planned: Planned[],
  existing: Map<string, string> | string[],
): PlanDiff {
  const toCancel: string[] = [];
  const toSchedule: Planned[] = [];
  if (existing instanceof Map) {
    for (const [id, fireAt] of existing) {
      const item = planned.find((p) => p.id === id);
      if (item === undefined) {
        toCancel.push(id);
        continue;
      }
      const existingMs = new Date(fireAt).getTime();
      const plannedMs = new Date(item.fireAt).getTime();
      if (
        Number.isNaN(existingMs) ||
        Math.abs(plannedMs - existingMs) > CHANGED_AFTER_MS
      ) {
        toCancel.push(id);
        toSchedule.push(item);
      }
    }
    for (const item of planned) {
      if (!existing.has(item.id)) {
        toSchedule.push(item);
      }
    }
  } else {
    const existingSet = new Set(existing);
    const plannedIds = new Set(planned.map((p) => p.id));
    for (const id of existing) {
      if (!plannedIds.has(id)) {
        toCancel.push(id);
      }
    }
    for (const item of planned) {
      if (!existingSet.has(item.id)) {
        toSchedule.push(item);
      }
    }
  }
  return { toCancel, toSchedule };
}
