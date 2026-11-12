// Backup export / import (spec §4.6). Import validates every row and
// rejects the whole file on the first error; nothing is written when
// validation fails.
import { PRAYER_ORDER } from "./constants";
import { isValidLocalDate } from "./dates";
import { ValidationError } from "./errors";
import type {
  CalculationMethodName,
  EventType,
  PrayerLogEntry,
  PrayerName,
  PrayerStatus,
  Source,
} from "./models";
import type { BackupFile, Repository } from "./repository";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const STATUSES: readonly PrayerStatus[] = [
  "pending",
  "on_time",
  "qaza",
  "settled",
];
const SOURCES: readonly Source[] = ["auto", "manual"];
const EVENT_TYPES: readonly EventType[] = [
  "MARKED_ON_TIME",
  "AUTO_QAZA",
  "MARKED_QAZA",
  "SETTLED",
  "CORRECTED",
];
const METHODS: readonly CalculationMethodName[] = [
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "UmmAlQura",
  "Dubai",
  "MoonsightingCommittee",
  "NorthAmerica",
  "Kuwait",
  "Qatar",
  "Singapore",
  "Tehran",
  "Turkey",
];

function fail(message: string): never {
  throw new ValidationError(message);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIso(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_RE.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function reqString(
  rec: Record<string, unknown>,
  key: string,
  where: string,
): string {
  const v = rec[key];
  if (typeof v !== "string" || v.length === 0) {
    fail(`${where}: ${key} must be a non-empty string`);
  }
  return v;
}

function reqUuid(
  rec: Record<string, unknown>,
  key: string,
  where: string,
): string {
  const v = reqString(rec, key, where);
  if (!UUID_RE.test(v)) {
    fail(`${where}: ${key} must be a UUID`);
  }
  return v;
}

function reqIso(
  rec: Record<string, unknown>,
  key: string,
  where: string,
): string {
  const v = rec[key];
  if (!isIso(v)) {
    fail(`${where}: ${key} must be an ISO UTC timestamp`);
  }
  return v;
}

function optIso(
  rec: Record<string, unknown>,
  key: string,
  where: string,
): string | null {
  const v = rec[key];
  if (v === null) {
    return null;
  }
  if (!isIso(v)) {
    fail(`${where}: ${key} must be an ISO UTC timestamp or null`);
  }
  return v;
}

function reqEnum<T extends string>(
  rec: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  where: string,
): T {
  const v = rec[key];
  if (typeof v !== "string" || !allowed.includes(v as T)) {
    fail(`${where}: ${key} must be one of ${allowed.join(", ")}`);
  }
  return v as T;
}

function reqNumberOrNull(
  rec: Record<string, unknown>,
  key: string,
  where: string,
): number | null {
  const v = rec[key];
  if (v === null) {
    return null;
  }
  if (typeof v !== "number" || !Number.isFinite(v)) {
    fail(`${where}: ${key} must be a finite number or null`);
  }
  return v;
}

function validateLog(raw: unknown, index: number): PrayerLogEntry {
  const where = `prayer_logs[${index}]`;
  if (!isRecord(raw)) {
    fail(`${where}: entry must be an object`);
  }
  const id = reqUuid(raw, "id", where);
  const prayerDate = reqString(raw, "prayer_date", where);
  if (!isValidLocalDate(prayerDate)) {
    fail(`${where}: prayer_date must be a valid YYYY-MM-DD date`);
  }
  const prayer = reqEnum<PrayerName>(raw, "prayer", PRAYER_ORDER, where);
  const status = reqEnum<PrayerStatus>(raw, "status", STATUSES, where);
  const source = reqEnum<Source>(raw, "source", SOURCES, where);
  const windowStart = optIso(raw, "window_start", where);
  const windowEnd = optIso(raw, "window_end", where);
  const timezone = reqString(raw, "timezone", where);
  const latitude = reqNumberOrNull(raw, "latitude", where);
  const longitude = reqNumberOrNull(raw, "longitude", where);
  const method = reqEnum<CalculationMethodName>(
    raw,
    "calculation_method",
    METHODS,
    where,
  );
  const madhab = reqEnum<"hanafi" | "shafi">(
    raw,
    "madhab",
    ["hanafi", "shafi"] as const,
    where,
  );
  const createdAt = reqIso(raw, "created_at", where);
  const updatedAt = reqIso(raw, "updated_at", where);
  return {
    id,
    prayer_date: prayerDate,
    prayer,
    status,
    source,
    window_start: windowStart,
    window_end: windowEnd,
    timezone,
    latitude,
    longitude,
    calculation_method: method,
    madhab,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function validateEvent(
  raw: unknown,
  index: number,
): {
  id: string;
  prayer_log_id: string;
  type: EventType;
  from_status: PrayerStatus | null;
  to_status: PrayerStatus;
  created_at: string;
} {
  const where = `prayer_events[${index}]`;
  if (!isRecord(raw)) {
    fail(`${where}: event must be an object`);
  }
  const id = reqUuid(raw, "id", where);
  const prayerLogId = reqUuid(raw, "prayer_log_id", where);
  const type = reqEnum<EventType>(raw, "type", EVENT_TYPES, where);
  const fromRaw = raw["from_status"];
  let fromStatus: PrayerStatus | null = null;
  if (fromRaw !== null) {
    if (typeof fromRaw !== "string" || !STATUSES.includes(fromRaw as PrayerStatus)) {
      fail(`${where}: from_status must be a prayer status or null`);
    }
    fromStatus = fromRaw as PrayerStatus;
  }
  const toStatus = reqEnum<PrayerStatus>(raw, "to_status", STATUSES, where);
  const createdAt = reqIso(raw, "created_at", where);
  return {
    id,
    prayer_log_id: prayerLogId,
    type,
    from_status: fromStatus,
    to_status: toStatus,
    created_at: createdAt,
  };
}

/**
 * Strictly validate an unknown value as a BackupFile. Throws
 * ValidationError on the first problem found.
 */
export function validateBackupFile(input: unknown): BackupFile {
  if (!isRecord(input)) {
    fail("backup file must be a JSON object");
  }
  if (input["schema_version"] !== 1) {
    fail("backup schema_version must be 1");
  }
  const exportedAt = reqIso(input, "exported_at", "backup");
  const appVersion = reqString(input, "app_version", "backup");
  const settings = input["settings"];
  if (!isRecord(settings)) {
    fail("backup settings must be an object");
  }
  const rawLogs = input["prayer_logs"];
  if (!Array.isArray(rawLogs)) {
    fail("backup prayer_logs must be an array");
  }
  const rawEvents = input["prayer_events"];
  if (!Array.isArray(rawEvents)) {
    fail("backup prayer_events must be an array");
  }

  const logs: PrayerLogEntry[] = [];
  const logIds = new Set<string>();
  const datePrayer = new Set<string>();
  for (let i = 0; i < rawLogs.length; i++) {
    const entry = validateLog(rawLogs[i], i);
    if (logIds.has(entry.id)) {
      fail(`prayer_logs[${i}]: duplicate id ${entry.id}`);
    }
    logIds.add(entry.id);
    const key = `${entry.prayer_date}|${entry.prayer}`;
    if (datePrayer.has(key)) {
      fail(
        `prayer_logs[${i}]: duplicate entry for ${entry.prayer_date} ${entry.prayer}`,
      );
    }
    datePrayer.add(key);
    logs.push(entry);
  }

  const events: BackupFile["prayer_events"] = [];
  const eventIds = new Set<string>();
  for (let i = 0; i < rawEvents.length; i++) {
    const event = validateEvent(rawEvents[i], i);
    if (eventIds.has(event.id)) {
      fail(`prayer_events[${i}]: duplicate id ${event.id}`);
    }
    eventIds.add(event.id);
    if (!logIds.has(event.prayer_log_id)) {
      fail(
        `prayer_events[${i}]: prayer_log_id ${event.prayer_log_id} does not reference any prayer log`,
      );
    }
    events.push(event);
  }

  return {
    schema_version: 1,
    exported_at: exportedAt,
    app_version: appVersion,
    settings,
    prayer_logs: logs,
    prayer_events: events,
  };
}

/** Export everything the repository holds, stamped with `appVersion`. */
export async function exportBackup(
  repo: Repository,
  appVersion: string,
): Promise<BackupFile> {
  const file = await repo.exportAll();
  return { ...file, app_version: appVersion };
}

/**
 * Validate then replace all data in one transaction. On validation
 * failure nothing is written.
 */
export async function importBackup(
  repo: Repository,
  input: unknown,
): Promise<void> {
  const file = validateBackupFile(input);
  await repo.transaction(async (tx) => {
    await tx.replaceAll(file);
  });
}
