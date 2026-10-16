import { useRef } from 'react';
import { reverseGeocode, type GeoResult } from '../geocode';
import { DEFAULT_CENTER, roundCoords, useGeo, type Coords } from '../geo';
import { MapView } from './MapView';
import { PlaceSearch } from './PlaceSearch';

/**
 * A pin and its address in a form (adding a place, a wishlist item): the address we filled in ourselves is replaced
 * when the pin moves, one the author typed never is.
 */
export function usePinAddress(address: string, set: (patch: { location?: Coords; address?: string }) => void) {
  // The address we filled in ourselves: replaced when the pin moves, unlike one the author typed.
  const autoAddress = useRef<string | null>(null);
  const lookup = useRef<AbortController | null>(null);
  const currentAddress = useRef(address);
  currentAddress.current = address;

  /** Fills the address unless the author typed their own; says whether it did. */
  const fillAddress = (next: string | null): boolean => {
    const current = currentAddress.current;
    if (!next || (current.trim() && current !== autoAddress.current)) return false;
    autoAddress.current = next;
    set({ address: next });
    return true;
  };

  /** A pin set by hand: look up its address. */
  const pinAt = (c: Coords) => {
    set({ location: roundCoords(c) });
    lookup.current?.abort();
    const ctrl = (lookup.current = new AbortController());
    reverseGeocode(c, ctrl.signal)
      .then((r) => fillAddress(r?.address ?? null))
      .catch(() => {}); // the address stays as it is
  };

  return {
    fillAddress,
    pinAt,
    /** Stops a pending address lookup (a search result or a link sets the address instead). */
    cancel: () => lookup.current?.abort(),
    /** The author typed the address: keep it. */
    typed: (value: string) => {
      autoAddress.current = null;
      set({ address: value });
    },
  };
}

/** "Miejsce na mapie": search OpenStreetMap, click the map or drag the pin, or use my location. */
export function LocationFieldset({
  location,
  onPick,
  onPin,
}: {
  location: Coords | null;
  onPick: (r: GeoResult) => void;
  onPin: (c: Coords) => void;
}) {
  const geo = useGeo();
  return (
    <fieldset className="field">
      <legend className="label">Miejsce na mapie</legend>
      <PlaceSearch near={location ?? geo.coords ?? DEFAULT_CENTER} onPick={onPick} />
      <p className="data muted">Albo kliknij mapę, żeby postawić pinezkę.</p>
      <MapView
        center={location ?? geo.coords ?? DEFAULT_CENTER}
        zoom={location ? 17 : 13}
        pin={location}
        onMapClick={onPin}
        onPinDrag={onPin}
        className="map-picker"
      />
      <div className="row">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => (geo.coords ? onPin(geo.coords) : geo.request())}
        >
          {geo.coords ? 'Tu, gdzie jestem' : geo.status === 'pending' ? 'Szukam…' : 'Użyj mojej lokalizacji'}
        </button>
        {location && (
          <span className="data muted">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </span>
        )}
      </div>
    </fieldset>
  );
}
