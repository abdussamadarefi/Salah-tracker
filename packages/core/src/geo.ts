// Geography helpers (spec §5.1). Haversine distance in metres.
import { LOCATION_CHANGE_THRESHOLD_M } from "./constants";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance between two points, in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000; // mean Earth radius, metres
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sLat = Math.sin(dLat / 2);
  const sLng = Math.sin(dLng / 2);
  const h =
    sLat * sLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sLng * sLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * True when the location has moved far enough to matter (spec §5.1, T8):
 * no previous location, or at least LOCATION_CHANGE_THRESHOLD_M (1000 m)
 * away from it.
 */
export function shouldUpdateLocation(
  prev: LatLng | null,
  next: LatLng,
): boolean {
  if (prev === null) {
    return true;
  }
  return haversineMeters(prev, next) >= LOCATION_CHANGE_THRESHOLD_M;
}
