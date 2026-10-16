import { useCallback, useEffect, useState } from 'react';

export type Coords = { lat: number; lng: number };

/** Rybnik (Rynek), where the map starts when the browser location is unknown. */
export const DEFAULT_CENTER: Coords = { lat: 50.0955, lng: 18.5419 };

/** Six decimals (~10 cm): what we store for a pin. */
export const roundCoords = (c: Coords): Coords => ({
  lat: Math.round(c.lat * 1e6) / 1e6,
  lng: Math.round(c.lng * 1e6) / 1e6,
});

let cached: Coords | null = null;

/**
 * The browser's location. Asked for only when `request()` is called (or automatically when permission was already
 * granted), never stored on the server: it is only sent as `lat`/`lng` query parameters.
 */
export function useGeo() {
  const [coords, setCoords] = useState<Coords | null>(cached);
  const [status, setStatus] = useState<'idle' | 'pending' | 'denied' | 'ok'>(cached ? 'ok' : 'idle');

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('denied');
    setStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        cached = { lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 };
        setCoords(cached);
        setStatus('ok');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (cached || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => p.state === 'granted' && request())
      .catch(() => {});
  }, [request]);

  return { coords, status, request };
}
