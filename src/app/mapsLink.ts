import { api, unwrap } from '../shared/api';
import type { Schemas } from '../shared/api';
import { reverseGeocode, searchPlaces, type GeoResult } from './geocode';
import { roundCoords, type Coords } from './geo';

export type ResolvedLink = Schemas['ResolvedMapsLink'];

/** What a pasted Google Maps link says (POST /maps-links/resolve): name, position, and places already nearby. */
export const resolveMapsLink = (text: string) => unwrap(api.POST('/maps-links/resolve', { body: { text } }));

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Whether two place names are the same place's ("Kawiarnia Relaks" ~ "Relaks – kawiarnia"). */
export function sameName(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const ta = new Set(x.split(' ').filter((t) => t.length > 1));
  const tb = new Set(y.split(' ').filter((t) => t.length > 1));
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / Math.min(ta.size, tb.size) >= 0.5;
}

/** Metres between two points (haversine). */
export function distance(a: Coords, b: Coords): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * The same place in OpenStreetMap, for its address and category: a result with the same name, within `radius` of
 * where Google puts it (or anywhere near, when the link had no position).
 */
export async function findInOsm(name: string, near: Coords, exact: boolean, radius = 250): Promise<GeoResult | null> {
  const results = await searchPlaces(name, near);
  return (
    results.find((r) => r.name && sameName(r.name, name) && (!exact || distance(r.location, near) <= radius)) ?? null
  );
}

/**
 * Where a resolved link points, completed from OpenStreetMap: the pin (Google's when precise, else the same place in
 * OSM), the address and category of that OSM place, or the address at the pin.
 */
export async function locateLink(
  link: ResolvedLink,
  near: Coords,
): Promise<{ location: Coords | null; address: string | null; osm: GeoResult | null }> {
  const at = link.location ? roundCoords(link.location) : null;
  const osm = link.name ? await findInOsm(link.name, at ?? near, !!at).catch(() => null) : null;
  const location = at && link.location?.precise ? at : (osm?.location ?? at);
  const address =
    osm?.address ?? (location ? ((await reverseGeocode(location).catch(() => null))?.address ?? null) : null);
  return { location, address, osm };
}

/** Whether a link opens Google Maps (and can be stored as a place's `google_maps_url`). */
export function isGoogleMapsLink(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (host === 'maps.app.goo.gl' || host === 'maps.google.com') return true;
    if (host === 'goo.gl') return u.pathname.startsWith('/maps');
    return /^google\.[a-z.]+$/.test(host) && u.pathname.startsWith('/maps');
  } catch {
    return false;
  }
}
