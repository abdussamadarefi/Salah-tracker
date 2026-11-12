import {
  addDays,
  diffDays,
  formatDateWithDay,
  formatTime,
  isValidLocalDate,
  parseLocalDate,
  startOfLocalDay,
  toLocalDate,
} from "../src/dates";
import { ValidationError } from "../src/errors";

describe("toLocalDate", () => {
  it("formats local components", () => {
    expect(toLocalDate(new Date(2026, 10, 10, 14, 30))).toBe("2026-11-10");
    expect(toLocalDate(new Date(2026, 0, 5, 0, 0))).toBe("2026-01-05");
  });

  it("rejects an invalid Date", () => {
    expect(() => toLocalDate(new Date("not a date"))).toThrow(
      ValidationError,
    );
  });
});

describe("addDays", () => {
  it.each([
    ["2026-11-10", 1, "2026-11-11"],
    ["2026-11-10", -1, "2026-11-09"],
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-11-30", 1, "2026-12-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2024-02-28", 1, "2024-02-29"], // leap day
    ["2024-02-28", 2, "2024-03-01"],
    ["2023-02-28", 1, "2023-03-01"], // non-leap year
    ["2026-11-10", 365, "2027-11-10"],
  ])("addDays(%s, %d) = %s", (from, n, expected) => {
    expect(addDays(from, n)).toBe(expected);
  });
});

describe("diffDays", () => {
  it("counts whole days both ways", () => {
    expect(diffDays("2026-11-10", "2026-11-10")).toBe(0);
    expect(diffDays("2026-11-10", "2026-11-13")).toBe(3);
    expect(diffDays("2026-11-13", "2026-11-10")).toBe(-3);
    expect(diffDays("2024-02-28", "2024-03-01")).toBe(2);
  });
});

describe("startOfLocalDay", () => {
  it("is local midnight and round-trips", () => {
    const d = startOfLocalDay("2026-11-10");
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(toLocalDate(d)).toBe("2026-11-10");
  });
});

describe("parseLocalDate / isValidLocalDate", () => {
  it("parses a valid date", () => {
    expect(parseLocalDate("2026-11-10")).toEqual({
      year: 2026,
      month: 11,
      day: 10,
    });
  });

  it.each(["2026-13-01", "2026-02-30", "2023-02-29", "10-11-2026", "2026-11-1", ""])(
    "rejects %s",
    (bad) => {
      expect(isValidLocalDate(bad)).toBe(false);
      expect(() => parseLocalDate(bad)).toThrow(ValidationError);
    },
  );

  it("accepts leap day in a leap year", () => {
    expect(isValidLocalDate("2024-02-29")).toBe(true);
  });
});

describe("formatDateWithDay", () => {
  it('returns "3 August, Monday"', () => {
    expect(formatDateWithDay("2026-08-03")).toBe("3 August, Monday");
  });

  it("returns the weekday for other dates", () => {
    expect(formatDateWithDay("2026-11-10")).toBe("10 November, Tuesday");
    expect(formatDateWithDay("2024-02-29")).toBe("29 February, Thursday");
  });
});

describe("formatTime", () => {
  it('returns "4:32 PM" for 16:32 Dhaka', () => {
    expect(formatTime("2026-11-10T10:32:00.000Z")).toBe("4:32 PM");
  });

  it("handles midnight and noon", () => {
    expect(formatTime("2026-11-09T18:05:00.000Z")).toBe("12:05 AM");
    expect(formatTime("2026-11-10T06:00:00.000Z")).toBe("12:00 PM");
  });

  it("accepts a Date and an explicit time zone", () => {
    expect(
      formatTime(new Date("2026-11-10T10:32:00.000Z"), "en-US", "Asia/Dhaka"),
    ).toBe("4:32 PM");
    expect(
      formatTime("2026-11-10T10:32:00.000Z", "en-US", "UTC"),
    ).toBe("10:32 AM");
  });

  it("rejects an invalid time", () => {
    expect(() => formatTime("not a time")).toThrow(ValidationError);
  });
});
