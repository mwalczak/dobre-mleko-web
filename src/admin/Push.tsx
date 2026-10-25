import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap, type Schemas } from '../shared/api';
import { categoryChoices, categoryInfo, useCategories } from '../shared/categories';
import { Avatar } from '../shared/components/Avatar';
import { CategoryMark } from '../shared/components/CategoryMark';
import { useToast } from '../shared/components/Toast';
import { ago, count, dateTime } from '../shared/format';

type Subscriber = Schemas['PushSubscriber'];
type AudienceChoice =
  | { kind: 'all' }
  | { kind: 'users'; user_ids: string[] }
  | { kind: 'categories'; categories: string[] };

const KEY = ['admin', 'push'];
const LOG_KEY = ['admin', 'push', 'log'];
const PEOPLE: [string, string, string] = ['osoba', 'osoby', 'osób'];
const DEVICES: [string, string, string] = ['urządzenie', 'urządzenia', 'urządzeń'];
const NEW_PLACES = { all: 'wszystkie', favorites: 'z ulubionych kategorii', none: 'żadne' } as const;
const KIND_LABEL = {
  new_place: 'Nowe miejsce',
  new_comment: 'Komentarz',
  gold_star: 'Złota Gwiazdka',
  member_joined: 'Dołączenie',
  join_request: 'Prośba o dołączenie',
  mention: 'Wzmianka',
  admin: 'Wiadomość',
} as const;

/**
 * Push notifications: who gets them on which devices (and what they chose), a message to everyone, to chosen
 * people or by favourite category, and the log of everything sent.
 */
export function Push() {
  useCategories();
  const overview = useQuery({ queryKey: KEY, queryFn: () => unwrap(api.GET('/admin/push')) });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyWithDevices, setOnlyWithDevices] = useState(false);
  if (overview.isLoading) return <p className="label">Ładowanie…</p>;
  if (!overview.data) return null;
  const { configured, members } = overview.data;
  const withDevices = members.filter((m) => m.devices.length > 0);
  const shown = onlyWithDevices ? withDevices : members;
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <section aria-label="Powiadomienia">
      {!configured && (
        <p className="panel push-warning" role="status">
          Serwer nie ma klucza APNs (<span className="data">APNS_KEY</span>, <span className="data">APNS_KEY_ID</span>,{' '}
          <span className="data">APNS_TEAM_ID</span>) — urządzenia się zapisują, ale nic nie zostanie wysłane.
        </p>
      )}
      <SendForm selected={members.filter((m) => selected.has(m.profile.id))} />
      <p className="label">
        {count(members.length, PEOPLE)} · {count(withDevices.length, PEOPLE)} z powiadomieniami ·{' '}
        {count(
          members.reduce((n, m) => n + m.devices.length, 0),
          DEVICES,
        )}
      </p>
      <label className="check push-filter">
        <input type="checkbox" checked={onlyWithDevices} onChange={(e) => setOnlyWithDevices(e.target.checked)} /> Tylko
        z urządzeniami
      </label>
      <div className="table-wrap panel">
        <table className="people">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Wybierz</span>
              </th>
              <th scope="col">Osoba</th>
              <th scope="col">Chce dostawać</th>
              <th scope="col">Urządzenia</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <SubscriberRow
                key={m.profile.id}
                member={m}
                selected={selected.has(m.profile.id)}
                onToggle={() => toggle(m.profile.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <History />
    </section>
  );
}

function SubscriberRow({
  member: m,
  selected,
  onToggle,
}: {
  member: Subscriber;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          className="push-select"
          aria-label={`Wybierz: ${m.profile.display_name}`}
          checked={selected}
          disabled={m.devices.length === 0}
          title={m.devices.length === 0 ? 'Nie ma urządzenia z powiadomieniami' : undefined}
          onChange={onToggle}
        />
      </td>
      <td>
        <div className="person">
          <Avatar name={m.profile.display_name} url={m.profile.avatar_url} size={32} />
          <div>
            <div className="person-name">{m.profile.display_name}</div>
            <div className="person-email data">{m.email}</div>
          </div>
        </div>
      </td>
      <td>
        <div className="data">Nowe miejsca: {NEW_PLACES[m.notifications.new_places]}</div>
        <div className="data">Komentarze: {m.notifications.comments ? 'tak' : 'nie'}</div>
        <div className="data">Złote Gwiazdki: {m.notifications.gold_stars ? 'tak' : 'nie'}</div>
        <div className="data">Dołączenia: {m.notifications.joins ? 'tak' : 'nie'}</div>
        <div className="data">Wzmianki: {m.notifications.mentions ? 'tak' : 'nie'}</div>
        {m.profile.favorite_categories.length > 0 && (
          <div className="push-favorites">
            {m.profile.favorite_categories.map((c) => (
              <span key={c} className="chip" title={categoryInfo(c).label}>
                <CategoryMark category={c} size={12} /> {categoryInfo(c).label}
              </span>
            ))}
          </div>
        )}
      </td>
      <td>
        {m.devices.length === 0 ? (
          <span className="data muted">brak</span>
        ) : (
          m.devices.map((d) => (
            <div key={`${d.app_id}-${d.created_at}`} className="data">
              {d.platform === 'ios' ? 'iPhone' : 'Android'} · {d.environment === 'sandbox' ? 'dev' : 'produkcja'} ·{' '}
              {ago(d.last_seen_at)}
            </div>
          ))
        )}
      </td>
    </tr>
  );
}

function SendForm({ selected }: { selected: Subscriber[] }) {
  const client = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<AudienceChoice['kind']>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [place, setPlace] = useState<{ id: string; name: string } | null>(null);
  const places = useQuery({
    queryKey: ['admin', 'push', 'places', placeQuery],
    queryFn: () =>
      unwrap(api.GET('/places', { params: { query: { q: placeQuery, limit: 6, include_closed: 'true' } } })),
    enabled: placeQuery.trim().length >= 2 && !place,
  });

  const audience: AudienceChoice =
    kind === 'all'
      ? { kind }
      : kind === 'users'
        ? { kind, user_ids: selected.map((m) => m.profile.id) }
        : { kind, categories };
  const ready =
    title.trim() && body.trim() && (kind === 'all' || (kind === 'users' ? selected.length > 0 : categories.length > 0));

  const send = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/admin/push', {
          body: { audience, title: title.trim(), body: body.trim(), place_id: place?.id ?? null },
        }),
      ),
    onSuccess: async (c) => {
      toast.ok(
        `Wysłano: ${count(c.recipients, PEOPLE)}, ${count(c.devices, DEVICES)} — doręczone ${c.delivered}` +
          (c.failed ? `, nieudane ${c.failed}.` : '.'),
      );
      setTitle('');
      setBody('');
      setPlace(null);
      setPlaceQuery('');
      await Promise.all([KEY, LOG_KEY].map((queryKey) => client.invalidateQueries({ queryKey })));
    },
    onError: toast.fail,
  });

  const describe =
    kind === 'all'
      ? 'Do wszystkich aktywnych osób (na wszystkie ich urządzenia).'
      : kind === 'users'
        ? selected.length
          ? `Do: ${selected.map((m) => m.profile.display_name).join(', ')}.`
          : 'Zaznacz osoby w tabeli poniżej.'
        : 'Do osób, które mają którąś z tych kategorii w ulubionych.';

  return (
    <form
      className="add-category panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm(`Wysłać powiadomienie „${title.trim()}”? ${describe}`)) send.mutate();
      }}
    >
      <h2 className="title">Nowe powiadomienie</h2>
      <fieldset className="field">
        <legend className="label">Do kogo</legend>
        <div className="chips">
          {(
            [
              ['all', 'Wszyscy'],
              ['users', `Zaznaczeni (${selected.length})`],
              ['categories', 'Ulubione kategorie'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {kind === 'categories' && (
          <div className="chips">
            {categoryChoices(categories).map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                aria-pressed={categories.includes(c.id)}
                onClick={() =>
                  setCategories(
                    categories.includes(c.id) ? categories.filter((x) => x !== c.id) : [...categories, c.id],
                  )
                }
              >
                <CategoryMark category={c.id} size={14} /> {c.label}
              </button>
            ))}
          </div>
        )}
        <span className="data muted">{describe}</span>
      </fieldset>
      <div className="field">
        <label htmlFor="push-title">Tytuł</label>
        <input id="push-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="push-body">Treść</label>
        <textarea
          id="push-body"
          required
          rows={3}
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="push-place">Otwórz miejsce (opcjonalnie)</label>
        {place ? (
          <div className="row">
            <span className="chip">{place.name}</span>
            <button type="button" className="btn btn-small btn-secondary" onClick={() => setPlace(null)}>
              Usuń
            </button>
          </div>
        ) : (
          <>
            <input
              id="push-place"
              type="search"
              placeholder="Szukaj miejsca…"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
            />
            {places.data && places.data.items.length > 0 && (
              <div className="chips">
                {places.data.items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip"
                    onClick={() => setPlace({ id: p.id, name: p.name })}
                  >
                    <CategoryMark category={p.category_id} size={14} /> {p.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <PushPreview title={title} body={body} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={!ready || send.isPending}>
          Wyślij
        </button>
      </div>
    </form>
  );
}

/** Roughly how it looks on the lock screen. */
function PushPreview({ title, body }: { title: string; body: string }) {
  if (!title.trim() && !body.trim()) return null;
  return (
    <div className="push-preview" aria-label="Podgląd powiadomienia">
      <span className="data muted">DOBRE MLEKO · teraz</span>
      <strong>{title.trim() || 'Tytuł'}</strong>
      <span>{body.trim() || 'Treść'}</span>
    </div>
  );
}

function History() {
  const log = useQuery({ queryKey: LOG_KEY, queryFn: () => unwrap(api.GET('/admin/push/log')) });
  const items = log.data?.items ?? [];
  return (
    <section aria-label="Wysłane">
      <h2 className="title push-history-title">Wysłane</h2>
      {items.length === 0 ? (
        <p className="data muted">Jeszcze nic nie wysłano.</p>
      ) : (
        <ol className="push-log panel">
          {items.map((l) => (
            <li key={l.id}>
              <div>
                <span className="badge">{KIND_LABEL[l.kind]}</span> <strong>{l.title}</strong>
                <p>{l.body}</p>
                <span className="data muted">
                  {dateTime(l.created_at)}
                  {l.sent_by && ` · ${l.sent_by.display_name}`} · {count(l.recipients, PEOPLE)} ·{' '}
                  {count(l.devices, DEVICES)} · doręczone {l.delivered}
                  {l.failed > 0 && ` · nieudane ${l.failed}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
