import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../../shared/api';
import { useToast } from '../../shared/components/Toast';
import { errorMessage } from '../../shared/errors';
import { LocationFieldset, usePinAddress } from '../components/LocationPicker';
import type { GeoResult } from '../geocode';
import { DEFAULT_CENTER, useGeo, type Coords } from '../geo';
import { isGoogleMapsLink, locateLink, resolveMapsLink } from '../mapsLink';
import { useWishlistItem, WISHLIST, type WishlistItem } from '../wishlist';

type Draft = { name: string; location: Coords | null; address: string; description: string; url: string };

const EMPTY: Draft = { name: '', location: null, address: '', description: '', url: '' };

const fromItem = (w: WishlistItem): Draft => ({
  name: w.name,
  location: { lat: w.lat, lng: w.lng },
  address: w.address ?? '',
  description: w.description ?? '',
  url: w.url ?? '',
});

/** S32 "Chcę odwiedzić": add to my wishlist. */
export function AddWishlistPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const create = useMutation({
    mutationFn: () => unwrap(api.POST('/me/wishlist', { body: body(draft) })),
    onSuccess: async (w) => {
      toast.ok('Dodano do listy „Chcę odwiedzić”.');
      await client.invalidateQueries({ queryKey: WISHLIST });
      navigate(`/wishlist/${w.id}`, { replace: true });
    },
    onError: toast.fail,
  });
  return (
    <WishlistForm
      title="Chcę odwiedzić"
      draft={draft}
      onChange={setDraft}
      busy={create.isPending}
      onSubmit={() => create.mutate()}
      onCancel={() => navigate(-1)}
    />
  );
}

/** S32 "Edytuj": change my wishlist item. */
export function EditWishlistPage() {
  const { id = '' } = useParams();
  const item = useWishlistItem(id);
  if (item.isLoading) return <p className="page label">Ładowanie…</p>;
  if (!item.data) return <p className="page notice">Nie ma takiej pozycji.</p>;
  if (!item.data.is_mine) return <p className="page notice">To nie Twoja lista.</p>;
  return <EditWishlist w={item.data} />;
}

function EditWishlist({ w }: { w: WishlistItem }) {
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => fromItem(w));
  const update = useMutation({
    mutationFn: () => unwrap(api.PATCH('/me/wishlist/{id}', { params: { path: { id: w.id } }, body: body(draft) })),
    onSuccess: async () => {
      toast.ok('Zapisano zmiany.');
      await client.invalidateQueries({ queryKey: WISHLIST });
      navigate(`/wishlist/${w.id}`);
    },
    onError: toast.fail,
  });
  return (
    <WishlistForm
      title="Edytuj"
      draft={draft}
      onChange={setDraft}
      busy={update.isPending}
      onSubmit={() => update.mutate()}
      onCancel={() => navigate(`/wishlist/${w.id}`)}
    />
  );
}

const body = (d: Draft) => ({
  name: d.name.trim(),
  lat: d.location!.lat,
  lng: d.location!.lng,
  address: d.address.trim() || null,
  description: d.description.trim() || null,
  url: d.url.trim() || null,
});

function WishlistForm({
  title,
  draft,
  onChange,
  busy,
  onSubmit,
  onCancel,
}: {
  title: string;
  draft: Draft;
  onChange: Dispatch<SetStateAction<Draft>>;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const geo = useGeo();
  const set = (patch: Partial<Draft>) => onChange((d) => ({ ...d, ...patch }));
  const pin = usePinAddress(draft.address, set);
  const [reading, setReading] = useState(false);
  const [linkNote, setLinkNote] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = !!draft.name.trim() && !!draft.location;

  /** A search result: pin, address, and the name when it is still empty. */
  const pick = (r: GeoResult) => {
    pin.cancel();
    pin.fillAddress(r.address);
    onChange((d) => ({ ...d, location: r.location, name: d.name.trim() || !r.name ? d.name : r.name }));
  };

  /** A Google Maps link in the Link field: the name (if empty), the pin and the address, like adding a place. */
  const readLink = async (text: string) => {
    setReading(true);
    setLinkNote(null);
    try {
      const link = await resolveMapsLink(text);
      pin.cancel();
      const { location, address } = await locateLink(link, draft.location ?? geo.coords ?? DEFAULT_CENTER);
      const filled: string[] = [];
      if (!draft.name.trim() && link.name) filled.push('nazwę');
      if (location) filled.push('miejsce na mapie');
      if (pin.fillAddress(address) && address !== draft.address) filled.push('adres');
      onChange((d) => ({
        ...d,
        url: link.url,
        name: d.name.trim() ? d.name : (link.name ?? ''),
        location: location ?? d.location,
      }));
      setLinkNote({
        ok: true,
        text: filled.length ? `Uzupełniono: ${filled.join(', ')}. Sprawdź i popraw, jeśli trzeba.` : 'Nic nowego.',
      });
    } catch (e) {
      setLinkNote({ ok: false, text: errorMessage(e) });
    } finally {
      setReading(false);
    }
  };

  return (
    <form
      className="page narrow place-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit();
      }}
    >
      <header className="page-head">
        <p className="label">Chcę odwiedzić</p>
        <h1 className="display">{title}</h1>
        <p className="muted">Miejsce, w które chcesz pojechać. Bez oceny i zdjęć — te dodasz, gdy już tam będziesz.</p>
      </header>

      <div className="field">
        <label htmlFor="wish-url">Link</label>
        <div className="row maps-link-row">
          <input
            id="wish-url"
            type="url"
            inputMode="url"
            maxLength={500}
            pattern="https?://.+"
            title="Link zaczynający się od http:// lub https://"
            placeholder="https://maps.app.goo.gl/… albo strona miejsca"
            value={draft.url}
            onChange={(e) => {
              setLinkNote(null);
              set({ url: e.target.value });
            }}
            onPaste={(e) => {
              // A pasted Google Maps link is read right away.
              const pasted = e.clipboardData.getData('text').trim();
              if (isGoogleMapsLink(pasted)) {
                e.preventDefault();
                set({ url: pasted });
                void readLink(pasted);
              }
            }}
          />
          {isGoogleMapsLink(draft.url) && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={reading}
              onClick={() => void readLink(draft.url)}
            >
              {reading ? 'Czytam…' : 'Wczytaj'}
            </button>
          )}
        </div>
        <span className="data muted">Strona, artykuł albo link z Google Maps (wypełni nazwę i miejsce).</span>
        <div aria-live="polite">{linkNote && <p className={linkNote.ok ? 'data' : 'notice'}>{linkNote.text}</p>}</div>
      </div>

      <div className="field">
        <label htmlFor="wish-name">Nazwa</label>
        <input
          id="wish-name"
          required
          maxLength={120}
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>

      <LocationFieldset location={draft.location} onPick={pick} onPin={pin.pinAt} />

      <div className="field">
        <label htmlFor="wish-address">Adres</label>
        <input
          id="wish-address"
          maxLength={200}
          placeholder="ul. Nowy Świat 22"
          value={draft.address}
          onChange={(e) => pin.typed(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="wish-description">Opis</label>
        <textarea
          id="wish-description"
          rows={4}
          maxLength={1000}
          placeholder="Dlaczego chcesz tam pojechać?"
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <span className="data muted">{draft.description.length}/1000</span>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>
          Zapisz
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Anuluj
        </button>
      </div>
      {!ready && <p className="data muted">Potrzebne: nazwa i miejsce na mapie.</p>}
    </form>
  );
}
