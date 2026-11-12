import { ValidationError } from "../src/errors";
import {
  exportBackup,
  importBackup,
  validateBackupFile,
} from "../src/backup";
import { InMemoryRepository } from "../src/testing/inMemoryRepository";
import { makeHarness } from "./helpers";

const NOON = "2026-11-10T14:00:00+06:00";

async function buildPopulatedRepo() {
  const { service, repo } = makeHarness(NOON);
  await service.ensureDay("2026-11-10");
  await service.answer("2026-11-10", "dhuhr", "prayed");
  await service.answer("2026-11-10", "fajr", "not_prayed");
  await service.settle("2026-11-10", "fajr");
  await service.addQazaRange("2026-11-08", "2026-11-09", ["fajr", "asr"]);
  return { service, repo };
}

describe("backup export/import (T10)", () => {
  it("export then import on a clean repo gives identical data", async () => {
    const { repo } = await buildPopulatedRepo();
    const file = await exportBackup(repo, "1.0.0");
    expect(file.schema_version).toBe(1);
    expect(file.app_version).toBe("1.0.0");

    const fresh = new InMemoryRepository();
    await importBackup(fresh, file);
    const a = await repo.exportAll();
    const b = await fresh.exportAll();
    expect(b.prayer_logs).toEqual(a.prayer_logs);
    expect(b.prayer_events).toEqual(a.prayer_events);
    expect(b.settings).toEqual(a.settings);
  });

  it("exportBackup stamps the given app version", async () => {
    const { repo } = await buildPopulatedRepo();
    const file = await exportBackup(repo, "9.9.9");
    expect(file.app_version).toBe("9.9.9");
  });

  it("validateBackupFile accepts a valid exported file", async () => {
    const { repo } = await buildPopulatedRepo();
    const file = await exportBackup(repo, "1.0.0");
    expect(validateBackupFile(file)).toEqual(file);
    // Plain JSON round-trip is still valid.
    expect(validateBackupFile(JSON.parse(JSON.stringify(file)))).toEqual(
      file,
    );
  });
});

describe("validateBackupFile rejections", () => {
  async function validFile(): Promise<Record<string, unknown>> {
    const { repo } = await buildPopulatedRepo();
    const file = await exportBackup(repo, "1.0.0");
    return JSON.parse(JSON.stringify(file)) as Record<string, unknown>;
  }

  it.each([
    ["not an object", null],
    ["an array", []],
    ["a string", "nope"],
  ])("rejects %s", async (_label, bad) => {
    await expect(
      (async () => validateBackupFile(bad))(),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a wrong schema_version", async () => {
    const file = await validFile();
    file["schema_version"] = 2;
    expect(() => validateBackupFile(file)).toThrow(ValidationError);
  });

  it("rejects a missing or empty app_version", async () => {
    const file = await validFile();
    delete file["app_version"];
    expect(() => validateBackupFile(file)).toThrow(ValidationError);
    const file2 = await validFile();
    file2["app_version"] = "";
    expect(() => validateBackupFile(file2)).toThrow(ValidationError);
  });

  it("rejects a bad exported_at", async () => {
    const file = await validFile();
    file["exported_at"] = "yesterday";
    expect(() => validateBackupFile(file)).toThrow(ValidationError);
  });

  it("rejects non-object settings and non-array rows", async () => {
    const file = await validFile();
    file["settings"] = "nope";
    expect(() => validateBackupFile(file)).toThrow(ValidationError);
    const file2 = await validFile();
    file2["prayer_logs"] = {};
    expect(() => validateBackupFile(file2)).toThrow(ValidationError);
    const file3 = await validFile();
    file3["prayer_events"] = null;
    expect(() => validateBackupFile(file3)).toThrow(ValidationError);
  });

  it("rejects a bad UUID, bad enum, bad date and bad timestamp in a log", async () => {
    const cases: Array<(file: Record<string, unknown>) => void> = [
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["id"] = "not-a-uuid";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["prayer"] = "noon";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["status"] = "late";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["source"] = "maybe";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["prayer_date"] = "2026-02-30";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["calculation_method"] = "Other";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["madhab"] = "maliki";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["created_at"] = "10 Nov 2026";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["latitude"] = "23.8";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["timezone"] = "";
      },
      (f) => {
        const logs = f["prayer_logs"] as Array<Record<string, unknown>>;
        const first = logs[0];
        if (first !== undefined) first["window_start"] = "tomorrow";
      },
    ];
    for (const mutate of cases) {
      const file = await validFile();
      mutate(file);
      expect(() => validateBackupFile(file)).toThrow(ValidationError);
    }
  });

  it("rejects a duplicate (prayer_date, prayer) and a duplicate log id", async () => {
    const file = await validFile();
    const logs = file["prayer_logs"] as Array<Record<string, unknown>>;
    const first = logs[0];
    if (first !== undefined) {
      logs.push({ ...first, id: "11111111-1111-4111-8111-111111111111" });
    }
    expect(() => validateBackupFile(file)).toThrow(ValidationError);

    const file2 = await validFile();
    const logs2 = file2["prayer_logs"] as Array<Record<string, unknown>>;
    const first2 = logs2[0];
    if (first2 !== undefined) {
      logs2.push({ ...first2, prayer_date: "2026-11-07" });
    }
    expect(() => validateBackupFile(file2)).toThrow(ValidationError);
  });

  it("rejects an event with an unknown prayer_log_id, bad type or bad status", async () => {
    const file = await validFile();
    const events = file["prayer_events"] as Array<Record<string, unknown>>;
    const first = events[0];
    if (first !== undefined) {
      first["prayer_log_id"] = "22222222-2222-4222-8222-222222222222";
    }
    expect(() => validateBackupFile(file)).toThrow(ValidationError);

    const file2 = await validFile();
    const events2 = file2["prayer_events"] as Array<Record<string, unknown>>;
    const first2 = events2[0];
    if (first2 !== undefined) first2["type"] = "PRAYED";
    expect(() => validateBackupFile(file2)).toThrow(ValidationError);

    const file3 = await validFile();
    const events3 = file3["prayer_events"] as Array<Record<string, unknown>>;
    const first3 = events3[0];
    if (first3 !== undefined) first3["to_status"] = "done";
    expect(() => validateBackupFile(file3)).toThrow(ValidationError);

    const file4 = await validFile();
    const events4 = file4["prayer_events"] as Array<Record<string, unknown>>;
    const first4 = events4[0];
    if (first4 !== undefined) first4["from_status"] = "done";
    expect(() => validateBackupFile(file4)).toThrow(ValidationError);

    const file5 = await validFile();
    const events5 = file5["prayer_events"] as Array<Record<string, unknown>>;
    const first5 = events5[0];
    if (first5 !== undefined) {
      // Same id twice: a duplicate event id.
      events5.push({ ...first5 });
    }
    expect(() => validateBackupFile(file5)).toThrow(ValidationError);
  });

  it("rejects a non-object log or event row", async () => {
    const file = await validFile();
    file["prayer_logs"] = ["nope"];
    expect(() => validateBackupFile(file)).toThrow(ValidationError);
    const file2 = await validFile();
    file2["prayer_events"] = [42];
    expect(() => validateBackupFile(file2)).toThrow(ValidationError);
  });
});

describe("importBackup failure leaves existing data unchanged", () => {
  it("rejects a corrupt file whole and keeps the old data", async () => {
    const { repo } = await buildPopulatedRepo();
    const before = await repo.exportAll();
    const corrupt = { schema_version: 99, prayer_logs: [], prayer_events: [] };
    await expect(importBackup(repo, corrupt)).rejects.toThrow(
      ValidationError,
    );
    const after = await repo.exportAll();
    expect(after.prayer_logs).toEqual(before.prayer_logs);
    expect(after.prayer_events).toEqual(before.prayer_events);
  });
});
