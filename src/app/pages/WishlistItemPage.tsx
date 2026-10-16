import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../../shared/api';
import { Avatar } from '../../shared/components/Avatar';
import { useToast } from '../../shared/components/Toast';
import { day, distance as formatDistance, today } from '../../shared/format';
import { MapView } from '../components/MapView';
import { WishRing } from '../components/WishRing';
import { useGeo } from '../geo';
import { distance } from '../mapsLink';
import { useWishlistItem, WISHLIST, type WishlistItem } from '../wishlist';

/** S23: one place on someone's "Chcę odwiedzić" list. */
export function WishlistItemPage() {
  const { id = '' } = useParams();
  const item = useWishlistItem(id);
  if (item.isLoading) return <p className="page label">Ładowanie…</p>;
  if (!item.data) return <p className="page notice">Nie ma takiej pozycji.</p>;
  return <Item w={item.data} />;
}

function Item({ w }: { w: WishlistItem }) {
  const geo = useGeo();
  const at = { lat: w.lat, lng: w.lng };
  const dist = geo.coords ? formatDistance(distance(geo.coords, at)) : null;
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lng}`;
  const markers = useMemo(() => [{ id: w.id, lat: w.lat, lng: w.lng, label: w.name, wish: true as const }], [w]);

  return (
    <article className="page narrow wish">
      <header className="place-head">
        <p className="label">
          <WishRing size={14} /> Chcę odwiedzić
        </p>
        <h1 className="display place-name wish-name">
          <WishRing size={40} /> <span>{w.name}</span>
        </h1>
        <p className="label">
          {w.address ?? 'Bez adresu'}
          {dist && ` · ${dist} od Ciebie`}
        </p>
        <Link
          to={w.is_mine ? '/me/wishlist' : `/members/${w.owner.id}/wishlist`}
          state={{ name: w.owner.display_name }}
          className="wish-owner"
        >
          <Avatar name={w.owner.display_name} url={w.owner.avatar_url} size={28} ring={w.is_mine ? 'me' : undefined} />
          <span className="data">{w.is_mine ? 'Twoja lista' : `Lista: ${w.owner.display_name}`}</span>
        </Link>
      </header>

      {w.visited_on && <p className="wish-visited">Odwiedzone {day(w.visited_on)}</p>}

      <MapView center={at} zoom={15} markers={markers} className="wish-map" />

      {w.is_mine ? <OwnerActions w={w} nav={nav} /> : <OthersActions w={w} nav={nav} />}

      {w.description && (
        <section className="place-section">
          <h2 className="label">Opis</h2>
          <p className="place-description wish-description">{w.description}</p>
        </section>
      )}
    </article>
  );
}

function OthersActions({ w, nav }: { w: WishlistItem; nav: string }) {
  return (
    <div className="place-actions">
      <a className="btn btn-primary" href={nav} target="_blank" rel="noreferrer">
        Nawiguj
      </a>
      <LinkButton w={w} />
      {w.place_id && (
        <Link to={`/places/${w.place_id}`} className="btn btn-secondary">
          Zobacz miejsce
        </Link>
      )}
    </div>
  );
}

const LinkButton = ({ w }: { w: WishlistItem }) =>
  w.url ? (
    <a className="btn btn-secondary" href={w.url} target="_blank" rel="noreferrer">
      Link
    </a>
  ) : null;

function OwnerActions({ w, nav }: { w: WishlistItem; nav: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(w.visited_on ?? today());
  const path = { params: { path: { id: w.id } } };

  const visit = useMutation({
    mutationFn: (visited_on: string | null) =>
      unwrap(api.PATCH('/me/wishlist/{id}', { ...path, body: { visited_on } })),
    onSuccess: (r) => {
      setPicking(false);
      toast.ok(r.visited_on ? `Odwiedzone ${day(r.visited_on)}.` : 'Znów na liście „Chcę odwiedzić”.');
      return client.invalidateQueries({ queryKey: WISHLIST });
    },
    onError: toast.fail,
  });
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE('/me/wishlist/{id}', path)),
    onSuccess: async () => {
      toast.ok('Usunięto z listy.');
      await client.invalidateQueries({ queryKey: WISHLIST });
      navigate('/me/wishlist', { replace: true });
    },
    onError: toast.fail,
  });

  return (
    <>
      <div className="place-actions">
        {!w.visited_on ? (
          <button
            type="button"
            className="btn btn-primary"
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
          >
            Odwiedzone
          </button>
        ) : (
          <>
            {!w.place_id && (
              <Link to={`/add?wishlist=${w.id}`} className="btn btn-primary">
                Dodaj jako miejsce
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              aria-expanded={picking}
              onClick={() => setPicking(!picking)}
            >
              Zmień datę
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={visit.isPending}
              onClick={() => visit.mutate(null)}
            >
              Nie odwiedzone
            </button>
          </>
        )}
        {w.place_id && (
          <Link to={`/places/${w.place_id}`} className="btn btn-secondary">
            Zobacz miejsce
          </Link>
        )}
        <a className="btn btn-secondary" href={nav} target="_blank" rel="noreferrer">
          Nawiguj
        </a>
        <LinkButton w={w} />
        <Link to={`/wishlist/${w.id}/edit`} className="btn btn-secondary">
          Edytuj
        </Link>
        <button
          type="button"
          className="btn btn-danger"
          disabled={remove.isPending}
          onClick={() => confirm(`Usunąć „${w.name}” z listy?`) && remove.mutate()}
        >
          Usuń
        </button>
      </div>
      {picking && (
        <form
          className="panel wish-visit"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) visit.mutate(date);
          }}
        >
          <div className="field">
            <label htmlFor="wish-visited-on">Kiedy byłeś?</label>
            <input
              id="wish-visited-on"
              type="date"
              required
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-small" disabled={!date || visit.isPending}>
              Zapisz
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setPicking(false)}>
              Anuluj
            </button>
          </div>
        </form>
      )}
    </>
  );
}
