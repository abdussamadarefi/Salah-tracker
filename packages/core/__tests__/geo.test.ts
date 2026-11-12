import { haversineMeters, shouldUpdateLocation } from "../src/geo";

const DHAKA = { lat: 23.8103, lng: 90.4125 };

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters(DHAKA, DHAKA)).toBe(0);
  });

  it("measures ~1.2 km for 0.0108 degrees of latitude", () => {
    const d = haversineMeters(DHAKA, { lat: 23.8211, lng: 90.4125 });
    expect(d).toBeGreaterThan(1190);
    expect(d).toBeLessThan(1210);
  });

  it("measures ~0.8 km for 0.0072 degrees of latitude", () => {
    const d = haversineMeters(DHAKA, { lat: 23.8175, lng: 90.4125 });
    expect(d).toBeGreaterThan(790);
    expect(d).toBeLessThan(810);
  });

  it("is symmetric", () => {
    const a = { lat: 23.8103, lng: 90.4125 };
    const b = { lat: 23.9, lng: 90.5 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("shouldUpdateLocation (T8)", () => {
  it("updates when there is no previous location", () => {
    expect(shouldUpdateLocation(null, DHAKA)).toBe(true);
  });

  it("updates when the move is 1.2 km", () => {
    expect(
      shouldUpdateLocation(DHAKA, { lat: 23.8211, lng: 90.4125 }),
    ).toBe(true);
  });

  it("does not update when the move is 0.8 km", () => {
    expect(
      shouldUpdateLocation(DHAKA, { lat: 23.8175, lng: 90.4125 }),
    ).toBe(false);
  });

  it("does not update for the same location", () => {
    expect(shouldUpdateLocation(DHAKA, DHAKA)).toBe(false);
  });
});
