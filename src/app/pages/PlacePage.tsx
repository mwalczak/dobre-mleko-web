import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
import { MentionText, MentionTextarea, mentionIds, type Mention } from '../components/MentionText';
import { CommentReactions } from '../components/Reactions';
import { SharePlace } from '../components/SharePlace';
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
        <SharePlace place={p} />
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
          {/* Who gave a star: their badge, as on the profile (no badge: their name); "×2" for stars in two months. */}
          <div className="avatars">
            {awarders(p.gold_star_awarders).map(({ who, stars }) => (
              <span key={who.id} className="badge" title={who.display_name}>
                {who.badge || who.display_name}
                {stars > 1 && ` ×${stars}`}
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
  const track = useRef<HTMLDivElement>(null);
  const last = p.photos.length - 1;
  // Scroll-snap alone only swipes on touch — arrows and thumbnails for mouse users (DM-47).
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: Math.max(0, Math.min(i, last)) * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div className="gallery" style={vars}>
      <div className="gallery-stage">
        <div
          ref={track}
          className="gallery-track"
          tabIndex={last > 0 ? 0 : undefined}
          aria-label={last > 0 ? 'Zdjęcia — strzałki w lewo i w prawo przewijają' : undefined}
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
        {index > 0 && (
          <button
            type="button"
            className="gallery-arrow gallery-prev"
            aria-label="Poprzednie zdjęcie"
            onClick={() => go(index - 1)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 4V20L6 12Z" />
            </svg>
          </button>
        )}
        {index < last && (
          <button
            type="button"
            className="gallery-arrow gallery-next"
            aria-label="Następne zdjęcie"
            onClick={() => go(index + 1)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4V20L18 12Z" />
            </svg>
          </button>
        )}
        <span className="gallery-count data">
          {Math.min(index + 1, p.photos.length)} / {p.photos.length}
        </span>
      </div>
      {last > 0 && (
        <div className="gallery-thumbs">
          {p.photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              className="gallery-thumb"
              aria-label={`Zdjęcie ${i + 1} z ${p.photos.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => go(i)}
            >
              <PhotoImage photo={photo} thumb alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Comments({ p, refresh }: { p: PlaceDetail; refresh: () => Promise<unknown> }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const add = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/places/{id}/comments', {
          params: { path: { id: p.id } },
          body: { body, mention_ids: mentionIds(body, mentions) },
        }),
      ),
    onSuccess: () => {
      setBody('');
      setMentions([]);
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
        <MentionTextarea
          id="comment"
          value={body}
          onChange={setBody}
          mentions={mentions}
          onMentionsChange={setMentions}
        />
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
  const [mentions, setMentions] = useState<Mention[]>(c.mentions);
  const path = { params: { path: { id: c.id } } };
  const edit = useMutation({
    mutationFn: () =>
      unwrap(api.PATCH('/comments/{id}', { ...path, body: { body, mention_ids: mentionIds(body, mentions) } })),
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
          <MemberLink member={c.author} />
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
            <MentionTextarea
              value={body}
              onChange={setBody}
              mentions={mentions}
              onMentionsChange={setMentions}
              label="Treść"
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
          <>
            <p>
              <MentionText text={c.body} mentions={c.mentions} />
            </p>
            <CommentReactions c={c} refresh={refresh} />
          </>
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

/** Gold star givers, each once, with how many stars they gave (one per month), in the order given. */
function awarders(list: Profile[]): { who: Profile; stars: number }[] {
  const byId = new Map<string, { who: Profile; stars: number }>();
  for (const who of list) {
    const seen = byId.get(who.id);
    if (seen) seen.stars += 1;
    else byId.set(who.id, { who, stars: 1 });
  }
  return [...byId.values()];
}

/** A member's name, linking to their profile (S50). */
function MemberLink({ member }: { member: Profile }) {
  if (member.status === 'deleted') return <>{member.display_name}</>;
  return <Link to={`/members/${member.id}`}>{member.display_name}</Link>;
}
