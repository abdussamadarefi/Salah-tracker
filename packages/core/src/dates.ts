// Local dates and formatting (spec §5.2). All date math uses the device
// time zone; no time zone library. A LocalDate is "YYYY-MM-DD".
import { ValidationError } from "./errors";
import type { IsoUtc, LocalDate } from "./models";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Parse and validate a LocalDate; throws ValidationError when malformed. */
export function parseLocalDate(ld: LocalDate): LocalDateParts {
  if (!DATE_RE.test(ld)) {
    throw new ValidationError(`invalid LocalDate: ${ld}`);
  }
  const year = Number(ld.slice(0, 4));
  const month = Number(ld.slice(5, 7));
  const day = Number(ld.slice(8, 10));
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    throw new ValidationError(`invalid LocalDate: ${ld}`);
  }
  return { year, month, day };
}

/** True when the string is a real calendar date in YYYY-MM-DD form. */
export function isValidLocalDate(value: string): value is LocalDate {
  try {
    parseLocalDate(value as LocalDate);
    return true;
  } catch {
    return false;
  }
}

/** LocalDate of a Date in the device time zone. */
export function toLocalDate(d: Date): LocalDate {
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError("invalid Date");
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add (or subtract, for negative n) whole days, crossing month/year ends. */
export function addDays(ld: LocalDate, n: number): LocalDate {
  const { year, month, day } = parseLocalDate(ld);
  return toLocalDate(new Date(year, month - 1, day + n));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round(
    (startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 86400000,
  );
}

/** A Date at local midnight on the given LocalDate. */
export function startOfLocalDay(ld: LocalDate): Date {
  const { year, month, day } = parseLocalDate(ld);
  return new Date(year, month - 1, day);
}

/**
 * "3 August, Monday" — built from Intl.DateTimeFormat.formatToParts,
 * because en-GB puts the weekday first.
 */
export function formatDateWithDay(ld: LocalDate, locale = "en-GB"): string {
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(startOfLocalDay(ld));
  const valueOf = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${valueOf("day")} ${valueOf("month")}, ${valueOf("weekday")}`;
}

/** 12-hour time, e.g. "4:32 PM". Defaults to the device time zone. */
export function formatTime(
  iso: IsoUtc | Date,
  locale = "en-US",
  timeZone?: string,
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`invalid time: ${String(iso)}`);
  }
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(timeZone !== undefined ? { timeZone } : {}),
  }).format(d);
}
