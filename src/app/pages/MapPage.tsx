import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../shared/api';
import { categoryInfo } from '../../shared/categories';
import { MapView, type Bbox, type MapMarker } from '../components/MapView';
import { PlaceCard } from '../components/PlaceCard';
import { WishRing } from '../components/WishRing';
import { useGeo, DEFAULT_CENTER } from '../geo';
import { WISHLIST } from '../wishlist';

const bboxParam = (b: Bbox) =>
  `${b.minLng.toFixed(5)},${b.minLat.toFixed(5)},${b.maxLng.toFixed(5)},${b.maxLat.toFixed(5)}`;

/** The "Chcę odwiedzić" layer stays on or off between visits (this browser only). */
const LAYER_KEY = 'dm.map.wishlist';
const layerStored = () => {
  try {
    return localStorage.getItem(LAYER_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Every place in the visible area (bbox), as category-shaped markers; with the "Chcę odwiedzić" layer on, also
 * everyone's not yet visited wishlist items, as yellow rings.
 */
export function MapPage() {
  const geo = useGeo();
  const navigate = useNavigate();
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [wishLayer, setWishLayer] = useState(layerStored);
  const center = geo.coords ?? DEFAULT_CENTER;

  const toggleWishes = () => {
    const next = !wishLayer;
    setWishLayer(next);
    try {
      localStorage.setItem(LAYER_KEY, next ? '1' : '0');
    } catch {
      // not remembered, still switched
    }
  };

  const places = useQuery({
    queryKey: ['places', 'map', bbox],
    enabled: !!bbox,
    placeholderData: keepPreviousData,
    queryFn: () =>
      unwrap(
        api.GET('/places', {
          params: {
            query: {
              bbox: bboxParam(bbox!),
              limit: 500,
              lat: geo.coords?.lat,
              lng: geo.coords?.lng,
            },
          },
        }),
      ),
  });
  const wishes = useQuery({
    queryKey: [...WISHLIST, 'map', bbox],
    enabled: !!bbox && wishLayer,
    placeholderData: keepPreviousData,
    queryFn: () => unwrap(api.GET('/wishlist', { params: { query: { bbox: bboxParam(bbox!), limit: 500 } } })),
  });
  const items = places.data?.items ?? [];
  const wishItems = useMemo(() => (wishLayer ? (wishes.data?.items ?? []) : []), [wishLayer, wishes.data]);
  const markers = useMemo(
    (): MapMarker[] => [
      ...items.map((p) => ({
        id: p.id,
        lat: p.location.lat,
        lng: p.location.lng,
        category: p.category_id,
        label: `${p.name}, ${categoryInfo(p.category_id).label}`,
      })),
      ...wishItems.map((w) => ({
        id: w.id,
        lat: w.lat,
        lng: w.lng,
        wish: true as const,
        label: `${w.name}, chce odwiedzić: ${w.owner.display_name}`,
      })),
    ],
    [items, wishItems],
  );
  const current = items.find((p) => p.id === selected);

  return (
    <div className="map-page">
      <MapView
        center={center}
        zoom={13}
        markers={markers}
        selectedId={selected}
        onMarkerClick={(id) => (wishItems.some((w) => w.id === id) ? navigate(`/wishlist/${id}`) : setSelected(id))}
        onMapClick={() => setSelected(null)}
        onMove={(b) => setBbox(b)}
        className="map-full"
      />
      <div className="map-overlay">
        <span className="label map-count">{places.data ? `${places.data.total} w widoku` : ' '}</span>
        <button type="button" className="btn btn-secondary btn-small map-locate" onClick={geo.request}>
          {geo.status === 'pending' ? 'Szukam…' : 'Moja lokalizacja'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small map-layer"
          aria-pressed={wishLayer}
          onClick={toggleWishes}
        >
          <WishRing size={16} /> Chcę odwiedzić
          {wishLayer && wishes.data ? ` (${wishes.data.total})` : ''}
        </button>
      </div>
      {current && (
        <div className="map-card">
          <PlaceCard place={current} compact />
        </div>
      )}
    </div>
  );
}
