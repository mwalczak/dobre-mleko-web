import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap, uploadImage, type Me } from '../../shared/api';
import { Avatar } from '../../shared/components/Avatar';
import { useToast } from '../../shared/components/Toast';
import { day, rating } from '../../shared/format';
import { preparePhoto } from '../../shared/image';
import { signOut, useMe } from '../../shared/session';
import { PlaceCard } from '../components/PlaceCard';
import { ProfileForm } from '../components/ProfileForm';
import { WishRing } from '../components/WishRing';
import { useWishlistCount } from '../wishlist';

export function MePage() {
  const me = useMe().data;
  const [tab, setTab] = useState<'saved' | 'ratings' | 'profile'>('saved');
  if (!me) return null;
  return (
    <div className="page">
      <header className="me-head">
        <AvatarUpload me={me} />
        <div>
          <h1 className="title">{me.display_name}</h1>
          {me.badge && <span className="badge">{me.badge}</span>}
          <p className="label">
            {me.email} · ★ {me.gold_stars.left}/{me.gold_stars.per_month} w tym miesiącu
          </p>
        </div>
      </header>
      <WishlistTile />
      <div className="tabs" role="tablist">
        {(
          [
            ['saved', 'Zapisane'],
            ['ratings', 'Moje oceny'],
            ['profile', 'Profil'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'saved' && <Saved />}
      {tab === 'ratings' && <MyRatings />}
      {tab === 'profile' && <Profile me={me} />}
    </div>
  );
}

/** "Chcę odwiedzić": how many on my list are still to visit; "+" adds one. */
function WishlistTile() {
  const count = useWishlistCount();
  return (
    <div className="wish-tile panel">
      <Link to="/me/wishlist" className="wish-tile-link">
        <WishRing size={32} />
        <span>
          <span className="title">Chcę odwiedzić</span>
          <span className="label">{count.data == null ? ' ' : `${count.data} do odwiedzenia`}</span>
        </span>
      </Link>
      <Link to="/wishlist/new" className="btn btn-primary wish-tile-add" aria-label="Dodaj do listy „Chcę odwiedzić”">
        +
      </Link>
    </div>
  );
}

function AvatarUpload({ me }: { me: Me }) {
  const input = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const toast = useToast();
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { blob } = await preparePhoto(file);
      return uploadImage<Me>('/me/avatar', blob);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['me'] }),
    onError: toast.fail,
  });
  return (
    <div className="avatar-upload">
      <button
        type="button"
        className="avatar-button"
        onClick={() => input.current?.click()}
        aria-label="Zmień zdjęcie profilowe"
      >
        <Avatar name={me.display_name} url={me.avatar_url} size={88} ring="me" />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
      />
    </div>
  );
}

function Saved() {
  const saved = useQuery({
    queryKey: ['places', 'saved'],
    queryFn: () => unwrap(api.GET('/me/saved', { params: { query: { limit: 100 } } })),
  });
  if (!saved.data) return <p className="label">Ładowanie…</p>;
  if (!saved.data.items.length)
    return <p className="muted">Nic jeszcze nie zapisałeś. Zapisuj miejsca, do których chcesz pójść.</p>;
  return (
    <div className="place-grid">
      {saved.data.items.map((p) => (
        <PlaceCard key={p.id} place={p} />
      ))}
    </div>
  );
}

function MyRatings() {
  const ratings = useQuery({
    queryKey: ['me', 'ratings'],
    queryFn: () => unwrap(api.GET('/me/ratings', { params: { query: { limit: 100 } } })),
  });
  if (!ratings.data) return <p className="label">Ładowanie…</p>;
  if (!ratings.data.items.length) return <p className="muted">Jeszcze nic nie oceniłeś.</p>;
  return (
    <ul className="my-ratings panel">
      {ratings.data.items.map((r) => (
        <li key={r.place.id}>
          <span className="my-rating-name">
            <Link to={`/places/${r.place.id}`}>{r.place.name}</Link>
            {r.visited_on && <span className="label">Byłem/am {day(r.visited_on)}</span>}
          </span>
          <span className="numeral small">{rating(r.overall)}</span>
        </li>
      ))}
    </ul>
  );
}

function Profile({ me }: { me: Me }) {
  const client = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (d: { display_name: string; badge: string; favorite_categories: Me['favorite_categories'] }) =>
      unwrap(api.PATCH('/me', { body: { ...d, badge: d.badge || null } })),
    onSuccess: () => {
      toast.ok('Zapisano profil.');
      return client.invalidateQueries({ queryKey: ['me'] });
    },
    onError: toast.fail,
  });
  return (
    <div className="narrow">
      <ProfileForm me={me} submitLabel="Zapisz profil" busy={save.isPending} onSubmit={(d) => save.mutate(d)} />
      <div className="form-actions">
        {me.is_admin && (
          <a className="btn btn-secondary" href="/admin/">
            Panel admina
          </a>
        )}
        <button type="button" className="btn btn-secondary" onClick={signOut}>
          Wyloguj
        </button>
      </div>
      <DeleteAccount />
    </div>
  );
}

/** Deletes the account (DELETE /me), then signs out. Places, ratings and comments stay as "Były członek". */
function DeleteAccount() {
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE('/me')),
    onSuccess: signOut,
    onError: toast.fail,
  });
  return (
    <section className="delete-account" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title" className="label">
        Usunięcie konta
      </h2>
      <p className="label">
        Imię, e-mail i zdjęcie profilowe znikną od razu. Miejsca, oceny i komentarze zostaną jako „Były członek”.{' '}
        <Link to="/usun-konto">Szczegóły</Link>
      </p>
      <button
        type="button"
        className="btn btn-danger"
        disabled={remove.isPending}
        onClick={() =>
          confirm(
            'Usunąć konto? Twoje imię, e-mail i zdjęcie profilowe zostaną usunięte, a miejsca, oceny i komentarze zostaną jako „Były członek”. Tego nie da się cofnąć.',
          ) && remove.mutate()
        }
      >
        Usuń konto
      </button>
    </section>
  );
}
