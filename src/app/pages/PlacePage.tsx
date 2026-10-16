import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap, type Comment, type PlaceDetail, type Profile } from '../../shared/api';
import { cardColor, textOn } from '../../shared/cardStyle';
import { categoryInfo, CRITERIA, STATUS_LABEL } from '../../shared/categories';
import { Avatar } from '../../shared/components/Avatar';
import { CategoryMark } from '../../shared/components/CategoryMark';
import { PhotoImage } from '../../shared/components/PhotoImage';
import { useToast } from '../../shared/components/Toast';
import { ago, count, date, day, distance, PRICE, rating } from '../../shared/format';
import { useMe } from '../../shared/session';
import { ColumnBars, CriteriaBars } from '../components/Bars';
import { useGeo } from '../geo';

export function usePlace(id: string) {
  const geo = useGeo();
  return useQuery({
    queryKey: ['place', id, geo.coords],
    queryFn: () =>
      unwrap(
        api.GET('/places/{id}', {
          params: { path: { id }, query: geo.coords ? { lat: geo.coords.lat, lng: geo.coords.lng } : {} },
        }),
      ),
  });
}

export function PlacePage() {
  const { id = '' } = useParams();
  const place = usePlace(id);
  if (place.isLoading) return <p className="page label">Ładowanie…</p>;
  if (!place.data) return <p className="page notice">Nie ma takiego miejsca.</p>;
  return <Place p={place.data} />;
}

function Place({ p }: { p: PlaceDetail }) {
  const me = useMe().data;
  const client = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['place', p.id] }),
      client.invalidateQueries({ queryKey: ['places'] }),
      client.invalidateQueries({ queryKey: ['me'] }),
    ]);
  const path = { params: { path: { id: p.id } } };

  const star = useMutation({
    mutationFn: () =>
      unwrap(p.my_gold_star ? api.DELETE('/places/{id}/gold-star', path) : api.POST('/places/{id}/gold-star', path)),
    onSuccess: (r) => {
      toast.ok(r.awarded ? `Złota gwiazdka! Zostało Ci ${r.gold_stars_left}.` : 'Gwiazdka wróciła do puli.');
      return refresh();
    },
    onError: toast.fail,
  });
  const save = useMutation({
    mutationFn: () => unwrap(p.is_saved ? api.DELETE('/places/{id}/saved', path) : api.PUT('/places/{id}/saved', path)),
    onSuccess: (r) => {
      toast.ok(r.is_saved ? 'Zapisano.' : 'Usunięto z zapisanych.');
      return refresh();
    },
    onError: toast.fail,
  });

  const c = categoryInfo(p.category_id);
  const dist = distance(p.distance_m);
  const strongest = CRITERIA.find((k) => k.key === p.strongest_criterion);
  const canEdit = p.is_mine || me?.is_admin;
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${p.location.lat},${p.location.lng}`;

  return (
    <article className="page place">
      <Gallery p={p} />

      <header className="place-head">
        <p className="label">
          <CategoryMark category={p.category_id} size={12} /> {c.label}
          {p.price_level ? ` · ${PRICE[p.price_level]}` : ''} ·{' '}
          {p.status !== 'active'
            ? STATUS_LABEL[p.status]
            : p.open_now == null
              ? 'Godziny nieznane'
              : p.open_now
                ? 'Czynne'
                : 'Teraz zamknięte'}
        </p>
        <h1 className="display place-name">{p.name}</h1>
        <p className="label">
          {p.address ?? 'Bez adresu'}
          {dist && ` · ${dist} od Ciebie`}
        </p>
      </header>

      <section className="place-scores">
        <div className="panel score-box">
          <span className="label">Ocena łączna</span>
          <span className="numeral">{rating(p.rating_avg)}</span>
          <span className="data">z 5 · {count(p.rating_count, ['ocena', 'oceny', 'ocen'])}</span>
        </div>
        <div className="panel score-box gold-box">
          <span className="label">Złote gwiazdki</span>
          <span className="numeral">{p.gold_star_count}</span>
          <span className="data">{p.gold_stars_this_month} w tym miesiącu</span>
        </div>
      </section>

      <div className="place-actions">
        <Link to={`/places/${p.id}/rate`} className="btn btn-primary">
          {p.my_scores ? 'Zmień ocenę' : 'Oceń'}
        </Link>
        {p.my_scores && p.my_visited_on && <span className="label place-visited">Byłem/am {day(p.my_visited_on)}</span>}
        <button
          type="button"
          className="btn btn-gold"
          aria-pressed={!!p.my_gold_star}
          disabled={
            star.isPending ||
            (!p.my_gold_star && p.gold_stars_left === 0) ||
            (!!p.my_gold_star && !p.can_revoke_gold_star)
          }
          onClick={() => star.mutate()}
        >
          ★ {p.my_gold_star ? 'Twoja gwiazdka' : `Gwiazdka (${p.gold_stars_left})`}
        </button>
        <button type="button" className="btn btn-secondary" aria-pressed={p.is_saved} onClick={() => save.mutate()}>
          {p.is_saved ? 'Zapisane' : 'Zapisz'}
        </button>
        <a className="btn btn-secondary" href={nav} target="_blank" rel="noreferrer">
          Nawiguj
        </a>
        {p.google_maps_url && (
          <a className="btn btn-secondary" href={p.google_maps_url} target="_blank" rel="noreferrer">
            Google Maps
          </a>
        )}
        {canEdit && (
          <Link to={`/places/${p.id}/edit`} className="btn btn-secondary">
            Edytuj
          </Link>
        )}
      </div>

      {p.description && (
        <section className="place-section">
          <h2 className="label">Dlaczego warto</h2>
          <p className="place-description">{p.description}</p>
          <p className="label">
            — <MemberLink member={p.author} />, dodał(a) {date(p.created_at)}
          </p>
        </section>
      )}

      {p.tags.length > 0 && (
        <div className="chips">
          {p.tags.map((t) => (
            <Link key={t} to={`/?tags=${encodeURIComponent(t)}`} className="chip">
              {t}
            </Link>
          ))}
        </div>
      )}

      {p.rating_count > 0 && (
        <section className="place-section place-breakdown">
          <div>
            <h2 className="label">Oceny w kryteriach</h2>
            <CriteriaBars
              rows={p.criteria.map((k) => ({
                label: CRITERIA.find((c) => c.key === k.key)!.label,
                value: k.average,
                strong: k.key === p.strongest_criterion,
              }))}
            />
            {strongest && <p className="label">Najmocniejsza strona: {strongest.label}</p>}
          </div>
          <div>
            <h2 className="label">Rozkład ocen</h2>
            <ColumnBars
              title="Rozkład ocen"
              values={[1, 2, 3, 4, 5].map((n) => p.rating_distribution[n as 1 | 2 | 3 | 4 | 5])}
              labels={['1', '2', '3', '4', '5']}
            />
          </div>
        </section>
      )}

      {p.gold_star_awarders.length > 0 && (
        <section className="place-section">
          <h2 className="label">Gwiazdki dali</h2>
          <div className="avatars">
            {p.gold_star_awarders.map((a, i) => (
              <span key={`${a.id}-${i}`} title={a.display_name}>
                <Avatar name={a.display_name} url={a.avatar_url} size={36} ring={a.id === me?.id ? 'me' : undefined} />
              </span>
            ))}
          </div>
        </section>
      )}

      <Comments p={p} refresh={refresh} />
    </article>
  );
}

/** The photos; the first one (the cover) wears the card's filter, the rest are originals. */
function Gallery({ p }: { p: PlaceDetail }) {
  const [index, setIndex] = useState(0);
  const color = cardColor(p.card_style, p.category_id);
  const vars = { ['--card' as string]: color, ['--card-on' as string]: textOn(color) };
  const effect = { filter: p.card_style.photo_filter, intensity: p.card_style.filter_intensity, color };
  if (!p.photos.length) {
    return (
      <div className="gallery gallery-empty" style={vars}>
        <CategoryMark category={p.category_id} size={96} color={textOn(color)} />
      </div>
    );
  }
  return (
    <div className="gallery" style={vars}>
      <div
        className="gallery-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {p.photos.map((photo, i) => (
          <PhotoImage
            key={photo.id}
            photo={photo}
            alt={`${p.name}, zdjęcie ${i + 1}`}
            className="gallery-item"
            effect={i === 0 ? effect : undefined}
          />
        ))}
      </div>
      <span className="gallery-count data">
        {Math.min(index + 1, p.photos.length)} / {p.photos.length}
      </span>
    </div>
  );
}

function Comments({ p, refresh }: { p: PlaceDetail; refresh: () => Promise<unknown> }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const add = useMutation({
    mutationFn: () => unwrap(api.POST('/places/{id}/comments', { params: { path: { id: p.id } }, body: { body } })),
    onSuccess: () => {
      setBody('');
      return refresh();
    },
    onError: toast.fail,
  });
  return (
    <section className="place-section">
      <h2 className="title">
        Komentarze <span className="muted">({p.comments.length})</span>
      </h2>
      <ul className="comments">
        {p.comments.map((c) => (
          <CommentItem key={c.id} c={c} refresh={refresh} />
        ))}
      </ul>
      <form
        className="comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) add.mutate();
        }}
      >
        <label htmlFor="comment">Dodaj komentarz</label>
        <textarea id="comment" rows={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={!body.trim() || add.isPending}>
          Dodaj
        </button>
      </form>
    </section>
  );
}

function CommentItem({ c, refresh }: { c: Comment; refresh: () => Promise<unknown> }) {
  const me = useMe().data;
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(c.body);
  const path = { params: { path: { id: c.id } } };
  const edit = useMutation({
    mutationFn: () => unwrap(api.PATCH('/comments/{id}', { ...path, body: { body } })),
    onSuccess: () => {
      setEditing(false);
      return refresh();
    },
    onError: toast.fail,
  });
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE('/comments/{id}', path)),
    onSuccess: refresh,
    onError: toast.fail,
  });
  return (
    <li className="comment">
      <Avatar name={c.author.display_name} url={c.author.avatar_url} size={36} ring={c.is_mine ? 'me' : undefined} />
      <div className="comment-body">
        <p className="label">
          {c.author.display_name}
          {c.author_rating != null && ` · ocena ${rating(c.author_rating)}`} · {ago(c.created_at)}
          {c.updated_at && ' · edytowany'}
        </p>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              edit.mutate();
            }}
          >
            <textarea
              rows={3}
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label="Treść"
            />
            <div className="row">
              <button type="submit" className="btn btn-primary btn-small" disabled={!body.trim()}>
                Zapisz
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditing(false)}>
                Anuluj
              </button>
            </div>
          </form>
        ) : (
          <p>{c.body}</p>
        )}
        {!editing && (c.is_mine || me?.is_admin) && (
          <div className="row">
            {c.is_mine && (
              <button type="button" className="link-button" onClick={() => setEditing(true)}>
                Edytuj
              </button>
            )}
            <button
              type="button"
              className="link-button danger"
              onClick={() => confirm('Usunąć komentarz?') && remove.mutate()}
            >
              Usuń
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** A member's name, linking to their "Chcę odwiedzić" list (the web has no member profile yet). */
function MemberLink({ member }: { member: Profile }) {
  if (member.status === 'deleted') return <>{member.display_name}</>;
  return (
    <Link to={`/members/${member.id}/wishlist`} state={{ name: member.display_name }} title="Lista „Chcę odwiedzić”">
      {member.display_name}
    </Link>
  );
}
