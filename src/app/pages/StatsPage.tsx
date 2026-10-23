import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap, type MyStats, type NetworkStats } from '../../shared/api';
import { categoryInfo } from '../../shared/categories';
import { Avatar } from '../../shared/components/Avatar';
import { CategoryMark } from '../../shared/components/CategoryMark';
import { number, rating } from '../../shared/format';
import { ColumnBars } from '../components/Bars';
import { PlaceCard } from '../components/PlaceCard';

const MONTHS = [
  'styczniu',
  'lutym',
  'marcu',
  'kwietniu',
  'maju',
  'czerwcu',
  'lipcu',
  'sierpniu',
  'wrześniu',
  'październiku',
  'listopadzie',
  'grudniu',
];

export function StatsPage() {
  const [tab, setTab] = useState<'network' | 'me'>('network');
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">
          Staty—
          <br />
          styki
        </h1>
      </header>
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'network'}
          onClick={() => setTab('network')}
        >
          Sieć
        </button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'me'} onClick={() => setTab('me')}>
          Ja
        </button>
      </div>
      {tab === 'network' ? <Network /> : <Mine />}
    </div>
  );
}

function Network() {
  const stats = useQuery({ queryKey: ['stats', 'network'], queryFn: () => unwrap(api.GET('/stats/network')) });
  if (!stats.data) return <p className="label">Ładowanie…</p>;
  const s: NetworkStats = stats.data;
  const month = MONTHS[Number(s.month.slice(5, 7)) - 1];
  return (
    <div className="stats">
      <dl className="tiles">
        <div>
          <dt>Miejsca</dt>
          <dd>{number(s.places)}</dd>
        </div>
        <div>
          <dt>Osoby</dt>
          <dd>{number(s.members)}</dd>
        </div>
        <div>
          <dt>Średnia</dt>
          <dd>{rating(s.average_rating)}</dd>
        </div>
        <div>
          <dt>Oceny</dt>
          <dd>{number(s.ratings)}</dd>
        </div>
      </dl>

      <section className="stats-gold panel">
        <div>
          <span className="label">Złote gwiazdki w {month}</span>
          <span className="numeral">{s.gold_stars_this_month}</span>
        </div>
        {s.star_of_the_month && (
          <Link to={`/places/${s.star_of_the_month.place.id}`} className="star-of-month">
            <span className="label">Gwiazda miesiąca</span>
            <span className="title">{s.star_of_the_month.place.name}</span>
            <span className="label">
              ★ {s.star_of_the_month.stars} · {categoryInfo(s.star_of_the_month.place.category_id).label}
            </span>
          </Link>
        )}
      </section>

      <section className="place-section">
        <h2 className="title">Top 10</h2>
        <ol className="top-list">
          {s.top.map((p, i) => (
            <li key={p.id}>
              <Link to={`/places/${p.id}`}>
                <span className="top-rank">{String(i + 1).padStart(2, '0')}</span>
                <CategoryMark category={p.category_id} size={16} title />
                <span className="top-name">{p.name}</span>
                <span className="top-score">{rating(p.rating_avg)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="place-section">
        <h2 className="label">Kategorie</h2>
        <CategoryShare items={s.categories} />
      </section>

      <section className="place-section">
        <h2 className="label">Oceny tydzień po tygodniu</h2>
        <ColumnBars
          title="Oceny w ostatnich 12 tygodniach"
          values={s.weekly_activity}
          labels={s.weekly_activity.map((_, i) =>
            i === s.weekly_activity.length - 1 ? 'teraz' : `-${s.weekly_activity.length - 1 - i}`,
          )}
        />
      </section>
    </div>
  );
}

function CategoryShare({ items }: { items: { category_id: string; count: number }[] }) {
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  return (
    <>
      <div className="share-bar" aria-hidden="true">
        {items.map((c) => (
          <span
            key={c.category_id}
            style={{ width: `${(c.count / total) * 100}%`, background: categoryInfo(c.category_id).color }}
          />
        ))}
      </div>
      <ul className="share-legend">
        {items.map((c) => (
          <li key={c.category_id}>
            <CategoryMark category={c.category_id} size={14} />
            <span>{categoryInfo(c.category_id).label}</span>
            <span className="data">{Math.round((c.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Mine() {
  const stats = useQuery({ queryKey: ['stats', 'me'], queryFn: () => unwrap(api.GET('/stats/me')) });
  if (!stats.data) return <p className="label">Ładowanie…</p>;
  const s: MyStats = stats.data;
  return (
    <div className="stats">
      <dl className="tiles">
        <div>
          <dt>Dodane miejsca</dt>
          <dd>{s.places_added}</dd>
        </div>
        <div>
          <dt>Moje oceny</dt>
          <dd>{s.ratings_given}</dd>
        </div>
        <div>
          <dt>Średnio daję</dt>
          <dd>{rating(s.average_given)}</dd>
        </div>
        <div>
          <dt>Gwiazdki do dania</dt>
          <dd>{s.gold_stars.left}</dd>
        </div>
      </dl>

      <section className="place-section">
        <h2 className="label">Jak oceniam</h2>
        <ColumnBars
          title="Rozkład moich ocen"
          values={[1, 2, 3, 4, 5].map((n) => s.distribution[n as 1 | 2 | 3 | 4 | 5])}
          labels={['1', '2', '3', '4', '5']}
        />
      </section>

      {s.categories.length > 0 && (
        <section className="place-section">
          <h2 className="label">Co oceniam</h2>
          <CategoryShare items={s.categories} />
        </section>
      )}

      <section className="place-section">
        <h2 className="title">Podobny gust</h2>
        {s.taste_matches.length === 0 ? (
          <p className="muted">Oceń więcej miejsc, które ocenili też inni (co najmniej 3 wspólne).</p>
        ) : (
          <ul className="matches">
            {s.taste_matches.map((m) => (
              <li key={m.profile.id} className="panel">
                <Avatar name={m.profile.display_name} url={m.profile.avatar_url} size={44} />
                <div>
                  <strong>{m.profile.display_name}</strong>
                  {m.profile.badge && <span className="badge">{m.profile.badge}</span>}
                </div>
                <span className="numeral match">{Math.round(m.match * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="place-section">
        <h2 className="title">Moje polecenia i ich gwiazdki</h2>
        {/* Only my places that got gold stars: none — either I added nothing, or nothing got a star yet. */}
        {s.my_places_with_stars.length > 0 ? (
          <div className="place-grid">
            {s.my_places_with_stars.map(({ place }) => (
              <PlaceCard key={place.id} place={place} compact />
            ))}
          </div>
        ) : (
          <p className="muted">
            {s.places_added > 0
              ? 'Twoje miejsca nie dostały jeszcze Złotych Gwiazdek.'
              : 'Nie dodałeś jeszcze żadnego miejsca.'}
          </p>
        )}
      </section>
    </div>
  );
}
