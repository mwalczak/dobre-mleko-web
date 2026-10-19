import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../../shared/api';
import { Avatar } from '../../shared/components/Avatar';
import { plural } from '../../shared/format';
import { useMe } from '../../shared/session';
import { PlaceCard } from '../components/PlaceCard';
import { WishRing } from '../components/WishRing';

/** S50: a member's profile — who they are, how their taste matches mine, their wishlist and the places they added. */
export function MemberPage() {
  const { id } = useParams();
  const me = useMe().data;
  // The network is small: GET /members lists everyone, there is no GET /members/:id.
  const members = useQuery({ queryKey: ['members'], queryFn: () => unwrap(api.GET('/members')) });
  const added = useQuery({
    queryKey: ['places', 'added-by', id],
    queryFn: () =>
      unwrap(
        api.GET('/places', { params: { query: { added_by: id, include_closed: 'true', sort: 'newest', limit: 100 } } }),
      ),
    enabled: !!id && id !== me?.id,
  });
  if (id && id === me?.id) return <Navigate to="/me" replace />;
  if (members.isLoading) return <p className="page label">Ładowanie…</p>;
  const member = members.data?.items.find((m) => m.profile.id === id);
  if (!member)
    return (
      <div className="page narrow">
        <p className="notice">Nie ma takiej osoby.</p>
      </div>
    );
  const { profile } = member;
  const name = profile.display_name;

  return (
    <div className="page">
      <header className="me-head">
        <Avatar name={name} url={profile.avatar_url} size={88} />
        <div>
          <h1 className="title">{name}</h1>
          {profile.badge && <span className="badge">{profile.badge}</span>}
          <p className="label">
            {member.places_added} {plural(member.places_added, ['miejsce', 'miejsca', 'miejsc'])} · {member.ratings}{' '}
            {plural(member.ratings, ['ocena', 'oceny', 'ocen'])}
          </p>
          {member.match != null && (
            <p className="label">
              Zgodność gustu {Math.round(member.match * 100)}% · {member.shared}{' '}
              {plural(member.shared ?? 0, ['wspólne miejsce', 'wspólne miejsca', 'wspólnych miejsc'])}
            </p>
          )}
        </div>
      </header>
      <div className="wish-tile panel">
        <Link to={`/members/${profile.id}/wishlist`} state={{ name }} className="wish-tile-link">
          <WishRing size={32} />
          <span>
            <span className="title">Chcę odwiedzić</span>
            <span className="label">{member.wishlist_to_visit} do odwiedzenia</span>
          </span>
        </Link>
      </div>
      <section className="place-section">
        <h2 className="label">Dodane miejsca · {member.places_added}</h2>
        {!added.data ? (
          <p className="label">Ładowanie…</p>
        ) : !added.data.items.length ? (
          <p className="muted">{name} nie dodał(a) jeszcze żadnego miejsca.</p>
        ) : (
          <div className="place-grid">
            {added.data.items.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
