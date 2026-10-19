import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, unwrap, type CardStyle, type Category, type PlaceDetail } from '../../shared/api';
import { DEFAULT_CARD_STYLE } from '../../shared/cardStyle';
import { categoryInfo, categoryChoices, STATUS_LABEL } from '../../shared/categories';
import { CategoryMark } from '../../shared/components/CategoryMark';
import { useToast } from '../../shared/components/Toast';
import { PRICE } from '../../shared/format';
import { useMeta } from '../../shared/session';
import { CardStyleFields } from '../components/CardStyleFields';
import { LocationFieldset, usePinAddress } from '../components/LocationPicker';
import { MapsLinkImport } from '../components/MapsLinkImport';
import { PhotoPicker, type Uploaded } from '../components/PhotoPicker';
import { PlacePhotosField } from '../components/PlacePhotosField';
import { EMPTY_SCORES, RatingInput, scoresComplete, type ScoresDraft } from '../components/RatingInput';
import { TagInput } from '../components/TagInput';
import { VisitDateField } from '../components/VisitDateField';
import { WishRing } from '../components/WishRing';
import type { GeoResult } from '../geocode';
import { useGeo, DEFAULT_CENTER, type Coords } from '../geo';
import { isGoogleMapsLink, locateLink, type ResolvedLink } from '../mapsLink';
import { useWishlistItem, WISHLIST } from '../wishlist';
import { usePlace } from './PlacePage';

type Draft = {
  name: string;
  category: Category | null;
  location: Coords | null;
  address: string;
  description: string;
  price: number | null;
  tags: string[];
  status: PlaceDetail['status'];
  style: CardStyle;
  mapsUrl: string | null;
};

const fromPlace = (p: PlaceDetail): Draft => ({
  name: p.name,
  category: p.category_id,
  location: p.location,
  address: p.address ?? '',
  description: p.description ?? '',
  price: p.price_level,
  tags: p.tags,
  status: p.status,
  style: p.card_style,
  mapsUrl: p.google_maps_url,
});

const EMPTY: Draft = {
  name: '',
  category: null,
  location: null,
  address: '',
  description: '',
  price: null,
  tags: [],
  status: 'active',
  style: DEFAULT_CARD_STYLE,
  mapsUrl: null,
};

/**
 * Adding a place needs the author's rating and at least one photo, sent together (POST /places). From a visited
 * wishlist item (`?wishlist=<id>`, "Dodaj jako miejsce") the form starts with its name, point, address, Google Maps
 * link and visit date, and the item is linked to the new place.
 */
export function AddPlacePage() {
  const meta = useMeta().data;
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [scores, setScores] = useState<ScoresDraft>(EMPTY_SCORES);
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [goldStar, setGoldStar] = useState(false);
  const [visitedOn, setVisitedOn] = useState('');

  const wishId = useSearchParams()[0].get('wishlist') ?? '';
  const wish = useWishlistItem(wishId);
  const fromWish = wish.data?.is_mine ? wish.data : null;
  const [prefilled, setPrefilled] = useState<string | null>(null);
  if (fromWish && prefilled !== fromWish.id) {
    setPrefilled(fromWish.id);
    setDraft((d) => ({
      ...d,
      name: fromWish.name,
      location: { lat: fromWish.lat, lng: fromWish.lng },
      address: fromWish.address ?? '',
      mapsUrl: isGoogleMapsLink(fromWish.url) ? fromWish.url!.trim() : d.mapsUrl,
    }));
    setVisitedOn(fromWish.visited_on ?? '');
  }
  const ready = draft.name.trim() && draft.category && draft.location && scoresComplete(scores) && photos.length > 0;

  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/places', {
          body: {
            name: draft.name.trim(),
            category_id: draft.category!,
            location: draft.location!,
            address: draft.address.trim() || null,
            description: draft.description.trim() || null,
            price_level: draft.price,
            tags: draft.tags,
            google_maps_url: draft.mapsUrl,
            rating: {
              vibe: scores.vibe!,
              offer: scores.offer!,
              service: scores.service,
              value: scores.value,
              visited_on: visitedOn || null,
            },
            photo_ids: photos.map((x) => x.id),
            gold_star: goldStar,
            card_style: draft.style,
          },
        }),
      ),
    onSuccess: async (p) => {
      toast.ok('Dodano miejsce.');
      if (fromWish) {
        // The wishlist item now points at the place ("Zobacz miejsce"); the place is added even if this fails.
        await unwrap(
          api.PATCH('/me/wishlist/{id}', { params: { path: { id: fromWish.id } }, body: { place_id: p.id } }),
        ).catch(toast.fail);
        await client.invalidateQueries({ queryKey: WISHLIST });
      }
      await client.invalidateQueries({ queryKey: ['places'] });
      navigate(`/places/${p.id}`);
    },
    onError: toast.fail,
  });

  return (
    <form
      className="page narrow place-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) create.mutate();
      }}
    >
      <header className="page-head">
        <h1 className="display">Dodaj miejsce</h1>
        <p className="muted">Tylko dobre miejsca: dodajesz je razem ze swoją oceną i zdjęciem.</p>
        {fromWish && (
          <p className="label wish-from">
            <WishRing size={14} /> Z listy „Chcę odwiedzić”: {fromWish.name}
          </p>
        )}
      </header>
      <PlaceFields draft={draft} onChange={setDraft} />
      <section className="place-section">
        <h2 className="title">Twoja ocena</h2>
        <RatingInput value={scores} onChange={setScores} />
        <VisitDateField value={visitedOn} onChange={setVisitedOn} />
      </section>
      <section className="place-section">
        <h2 className="label">Zdjęcia</h2>
        <PhotoPicker value={photos} onChange={setPhotos} max={meta?.max_photos_per_rating ?? 6} required />
      </section>
      <CardStyleFields
        value={draft.style}
        onChange={(style) => setDraft({ ...draft, style })}
        category={draft.category}
        name={draft.name}
        photo={photos[0] ? { url: photos[0].preview, thumb_url: photos[0].preview, blurhash: null } : null}
      />
      <label className="check">
        <input type="checkbox" checked={goldStar} onChange={(e) => setGoldStar(e.target.checked)} />
        <span>
          Złota gwiazdka · „musisz tam iść” <span className="muted">(z Twojej puli na ten miesiąc)</span>
        </span>
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!ready || create.isPending}>
          Dodaj miejsce
        </button>
      </div>
      {!ready && (
        <p className="data muted">
          Potrzebne: nazwa, kategoria, miejsce na mapie, klimat i oferta oraz co najmniej jedno zdjęcie.
        </p>
      )}
    </form>
  );
}

export function EditPlacePage() {
  const { id = '' } = useParams();
  const place = usePlace(id);
  if (place.isLoading) return <p className="page label">Ładowanie…</p>;
  if (!place.data) return <p className="page notice">Nie ma takiego miejsca.</p>;
  return <EditPlace p={place.data} />;
}

function EditPlace({ p }: { p: PlaceDetail }) {
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => fromPlace(p));
  const path = { params: { path: { id: p.id } } };
  const refresh = () =>
    client
      .invalidateQueries({ queryKey: ['places'] })
      .then(() => client.invalidateQueries({ queryKey: ['place', p.id] }));

  const update = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH('/places/{id}', {
          ...path,
          body: {
            name: draft.name.trim(),
            category_id: draft.category!,
            location: draft.location!,
            address: draft.address.trim() || null,
            description: draft.description.trim() || null,
            price_level: draft.price,
            tags: draft.tags,
            google_maps_url: draft.mapsUrl,
            status: draft.status,
            card_style: draft.style,
          },
        }),
      ),
    onSuccess: async () => {
      toast.ok('Zapisano zmiany.');
      await refresh();
      navigate(`/places/${p.id}`);
    },
    onError: toast.fail,
  });
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE('/places/{id}', path)),
    onSuccess: async () => {
      toast.ok('Usunięto miejsce.');
      await client.invalidateQueries({ queryKey: ['places'] });
      navigate('/');
    },
    onError: toast.fail,
  });

  return (
    <form
      className="page narrow place-form"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate();
      }}
    >
      <header className="page-head">
        <p className="label">Edycja</p>
        <h1 className="display">{p.name}</h1>
      </header>
      <PlaceFields draft={draft} onChange={setDraft} />
      <PlacePhotosField place={p} />
      <CardStyleFields
        value={draft.style}
        onChange={(style) => setDraft({ ...draft, style })}
        category={draft.category}
        name={draft.name}
        photo={p.cover_photo}
      />
      <fieldset className="field">
        <legend className="label">Status</legend>
        <div className="chips">
          {(Object.keys(STATUS_LABEL) as Draft['status'][]).map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={draft.status === s}
              onClick={() => setDraft({ ...draft, status: s })}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!draft.name.trim() || update.isPending}>
          Zapisz
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/places/${p.id}`)}>
          Anuluj
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() =>
            confirm(
              'Usunąć to miejsce razem z ocenami, zdjęciami i komentarzami? Jeśli już nie istnieje, lepiej oznacz je jako zamknięte.',
            ) && remove.mutate()
          }
        >
          Usuń miejsce
        </button>
      </div>
    </form>
  );
}

function PlaceFields({ draft, onChange }: { draft: Draft; onChange: Dispatch<SetStateAction<Draft>> }) {
  const geo = useGeo();
  const set = (patch: Partial<Draft>) => onChange((d) => ({ ...d, ...patch }));
  const pin = usePinAddress(draft.address, set);

  /** A search result: pin, address, and the name and category when they are still empty. */
  const pick = (r: GeoResult) => {
    pin.cancel();
    pin.fillAddress(r.address);
    onChange((d) => ({
      ...d,
      location: r.location,
      name: d.name.trim() || !r.name ? d.name : r.name,
      // Only a category that is still offered.
      category: d.category ?? (r.category && categoryInfo(r.category).active ? r.category : null),
    }));
  };

  /**
   * A pasted Google Maps link: the link, the pin, the name if empty; then the same place in OpenStreetMap for the
   * address and category (or the address at the pin). Says what it filled.
   */
  const fromLink = async (link: ResolvedLink): Promise<string[]> => {
    pin.cancel();
    const filled: string[] = [];
    const name = draft.name.trim() || link.name || '';
    const { location: where, address, osm } = await locateLink(link, draft.location ?? geo.coords ?? DEFAULT_CENTER);
    const category = osm?.category && categoryInfo(osm.category).active ? osm.category : null;

    if (!draft.name.trim() && link.name) filled.push('nazwę');
    if (where) filled.push('miejsce na mapie');
    const addressBefore = draft.address;
    if (pin.fillAddress(address) && address !== addressBefore) filled.push('adres');
    if (!draft.category && category) filled.push('kategorię');
    onChange((d) => ({
      ...d,
      mapsUrl: link.url,
      name: d.name.trim() ? d.name : name,
      location: where ?? d.location,
      category: d.category ?? category,
    }));
    return filled;
  };

  return (
    <>
      <MapsLinkImport onResolved={fromLink} />
      <div className="field">
        <label htmlFor="place-name">Nazwa</label>
        <input
          id="place-name"
          required
          maxLength={120}
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>

      <fieldset className="field">
        <legend className="label">Kategoria</legend>
        <div className="chips">
          {categoryChoices([draft.category]).map(({ id: c }) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={draft.category === c}
              onClick={() => set({ category: c })}
            >
              <CategoryMark category={c} size={14} /> {categoryInfo(c).label}
            </button>
          ))}
        </div>
      </fieldset>

      <LocationFieldset location={draft.location} onPick={pick} onPin={pin.pinAt} />

      <div className="field">
        <label htmlFor="place-address">Adres</label>
        <input
          id="place-address"
          maxLength={200}
          placeholder="ul. Nowy Świat 22"
          value={draft.address}
          onChange={(e) => pin.typed(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="place-description">Dlaczego warto</label>
        <textarea
          id="place-description"
          rows={3}
          maxLength={500}
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <span className="data muted">{draft.description.length}/500</span>
      </div>

      <fieldset className="field">
        <legend className="label">Ceny</legend>
        <div className="chips">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={draft.price === n}
              onClick={() => set({ price: draft.price === n ? null : n })}
            >
              {PRICE[n]}
            </button>
          ))}
        </div>
      </fieldset>

      <TagInput value={draft.tags} onChange={(tags) => set({ tags })} category={draft.category} />
    </>
  );
}
