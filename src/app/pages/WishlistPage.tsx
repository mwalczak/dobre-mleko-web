import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api';
import { day, distance as formatDistance } from '../../shared/format';
import { useMe } from '../../shared/session';
import { WishRing } from '../components/WishRing';
import { useGeo } from '../geo';
import { distance } from '../mapsLink';
import { useWishlist, type WishlistItem } from '../wishlist';

/** S55: my "Chcę odwiedzić" list (/me/wishlist) or a member's (/members/:id/wishlist). */
export function WishlistPage() {
  const { id } = useParams();
  const me = useMe().data;
  const mine = !id || id === me?.id;
  const list = useWishlist(mine ? null : id!);
  // The member's name: from their items, or passed along by the link that led here.
  const passed = (useLocation().state as { name?: string } | null)?.name;
  const owner = list.data?.items[0]?.owner.display_name ?? passed;
  const items = list.data?.items ?? [];
  const toVisit = items.filter((w) => !w.visited_on);
  const visited = items.filter((w) => w.visited_on);

  return (
    <div className="page narrow">
      <header className="page-head wish-list-head">
        <div>
          <p className="label">{mine ? 'Twoja lista' : owner ? `Lista: ${owner}` : 'Lista'}</p>
          <h1 className="display">Chcę odwiedzić</h1>
        </div>
        {mine && (
          <Link to="/wishlist/new" className="btn btn-primary" aria-label="Dodaj do listy „Chcę odwiedzić”">
            +
          </Link>
        )}
      </header>
      {list.isLoading ? (
        <p className="label">Ładowanie…</p>
      ) : list.error instanceof ApiError && list.error.status === 404 ? (
        <p className="notice">Nie ma takiej osoby.</p>
      ) : !items.length ? (
        <div className="empty panel wish-empty">
          <WishRing size={64} />
          {mine ? (
            <>
              <p>Dodaj miejsce, w które chcesz pojechać.</p>
              <Link to="/wishlist/new" className="btn btn-primary">
                Dodaj
              </Link>
            </>
          ) : (
            <p>Nic tu jeszcze nie ma.</p>
          )}
        </div>
      ) : (
        <>
          {toVisit.length > 0 && (
            <section className="place-section">
              <h2 className="label">Chcę odwiedzić · {toVisit.length}</h2>
              <WishRows items={toVisit} />
            </section>
          )}
          {visited.length > 0 && (
            <section className="place-section">
              <h2 className="label">Odwiedzone · {visited.length}</h2>
              <WishRows items={visited} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WishRows({ items }: { items: WishlistItem[] }) {
  const geo = useGeo();
  return (
    <ul className="wish-rows panel">
      {items.map((w) => {
        const dist = geo.coords ? formatDistance(distance(geo.coords, { lat: w.lat, lng: w.lng })) : null;
        return (
          <li key={w.id} className={w.visited_on ? 'visited' : undefined}>
            <Link to={`/wishlist/${w.id}`} className="wish-row">
              <WishRing size={28} />
              <span className="wish-row-body">
                <strong>{w.name}</strong>
                <span className="label">
                  {w.visited_on && `Odwiedzone ${day(w.visited_on)} · `}
                  {[w.address, dist].filter(Boolean).join(' · ') || 'Bez adresu'}
                </span>
                {w.description && <span className="wish-row-desc">{w.description}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
