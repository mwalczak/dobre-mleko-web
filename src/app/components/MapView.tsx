import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef } from 'react';
import type { Category } from '../../shared/api';
import { shapeMarkup } from '../../shared/categories';
import type { Coords } from '../geo';
import { WISH_RING } from '../wishlist';

// MapLibre finds its worker next to its own module, which is not where the bundle puts it: ship it as an asset.
maplibregl.setWorkerUrl(workerUrl);

/** OpenFreeMap (same tiles as the iOS app). Override with VITE_MAP_STYLE. */
const STYLE_URL: string = import.meta.env.VITE_MAP_STYLE || 'https://tiles.openfreemap.org/styles/positron';

/** Used when the tile style cannot be loaded, so markers still work. */
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'paper', type: 'background', paint: { 'background-color': '#F1ECE2' } }],
};

let style: Promise<string | maplibregl.StyleSpecification> | null = null;
const loadStyle = () =>
  (style ??= fetch(STYLE_URL)
    .then((r) => (r.ok ? STYLE_URL : FALLBACK_STYLE))
    .catch(() => FALLBACK_STYLE));

/** A place (its category's mark) or a wishlist item (`wish`: the yellow ring). */
export type MapMarker = { id: string; lat: number; lng: number; label: string } & (
  | { category: Category; wish?: false }
  | { wish: true }
);
export type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

function markerElement(m: MapMarker, selected: boolean, onClick: (id: string) => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `map-marker${m.wish ? ' map-marker-wish' : ''}${selected ? ' selected' : ''}`;
  el.setAttribute('aria-label', m.label);
  el.innerHTML = `<svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">${m.wish ? WISH_RING : shapeMarkup(m.category)}</svg>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick(m.id);
  });
  return el;
}

/**
 * A MapLibre map with category-shaped markers (and yellow rings for wishlist items). Reports the visible area on every move, and clicks on empty map
 * (for picking a location).
 */
export function MapView({
  center,
  zoom = 13,
  markers = [],
  selectedId,
  onMarkerClick,
  onMove,
  onMapClick,
  pin,
  onPinDrag,
  className,
}: {
  center: Coords;
  zoom?: number;
  markers?: MapMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  onMove?: (bbox: Bbox, center: Coords) => void;
  onMapClick?: (coords: Coords) => void;
  pin?: Coords | null;
  /** Makes the pin draggable; called where it is dropped. */
  onPinDrag?: (coords: Coords) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const handlers = useRef({ onMove, onMapClick, onMarkerClick, onPinDrag });
  handlers.current = { onMove, onMapClick, onMarkerClick, onPinDrag };
  const drawn = useRef<maplibregl.Marker[]>([]);
  const pinMarker = useRef<maplibregl.Marker | null>(null);
  // The map is created after the style loads; use the latest center, not the first render's.
  const latest = useRef({ center, zoom });
  latest.current = { center, zoom };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadStyle().then((s) => {
      if (cancelled || !container.current) return;
      const m = new maplibregl.Map({
        container: container.current,
        style: s,
        center: [latest.current.center.lng, latest.current.center.lat],
        zoom: latest.current.zoom,
        attributionControl: { compact: true },
      });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const report = () => {
        const b = m.getBounds();
        const c = m.getCenter();
        handlers.current.onMove?.(
          { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() },
          { lat: c.lat, lng: c.lng },
        );
      };
      m.on('moveend', report);
      m.on('load', report);
      m.on('click', (e: maplibregl.MapMouseEvent) =>
        handlers.current.onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }),
      );
      map.current = m;
      report();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []); // created once; later center changes are applied below

  // Follow center changes (e.g. "my location", a search result), zooming in to `zoom` but never out.
  useEffect(() => {
    const m = map.current;
    if (m && (Math.abs(m.getCenter().lat - center.lat) > 1e-6 || Math.abs(m.getCenter().lng - center.lng) > 1e-6)) {
      m.easeTo({ center: [center.lng, center.lat], zoom: Math.max(m.getZoom(), zoom) });
    }
  }, [center.lat, center.lng, zoom]);

  // Markers.
  useEffect(() => {
    const draw = () => {
      const m = map.current;
      if (!m) return void setTimeout(draw, 50);
      drawn.current.forEach((d) => d.remove());
      drawn.current = markers.map((mk) =>
        new maplibregl.Marker({
          element: markerElement(mk, mk.id === selectedId, (id) => handlers.current.onMarkerClick?.(id)),
        })
          .setLngLat([mk.lng, mk.lat])
          .addTo(m),
      );
    };
    draw();
  }, [markers, selectedId]);

  // A single pin (location picker).
  useEffect(() => {
    const draw = () => {
      const m = map.current;
      if (!m) return void setTimeout(draw, 50);
      pinMarker.current?.remove();
      if (!pin) return void (pinMarker.current = null);
      const marker = new maplibregl.Marker({ color: '#D7301F', draggable: !!handlers.current.onPinDrag })
        .setLngLat([pin.lng, pin.lat])
        .addTo(m);
      marker.on('dragend', () => {
        const at = marker.getLngLat();
        handlers.current.onPinDrag?.({ lat: at.lat, lng: at.lng });
      });
      pinMarker.current = marker;
    };
    draw();
  }, [pin?.lat, pin?.lng]);

  return <div ref={container} className={`map ${className ?? ''}`} />;
}
