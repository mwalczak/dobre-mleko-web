import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../../shared/api';
import { Brand } from '../../shared/components/Brand';
import { CategoryMark } from '../../shared/components/CategoryMark';
import { useToast } from '../../shared/components/Toast';
import { plural, rating } from '../../shared/format';
import { playUrlForShare } from '../../shared/links';
import { useMe, useToken } from '../../shared/session';

type Device = 'android' | 'ios' | 'other';

function device(): Device {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'other';
}

/** Counts the visit once per browser session (link-preview bots get the API's Open Graph page instead). */
function useCountOpen(token: string | undefined) {
  useEffect(() => {
    if (!token) return;
    const key = `share-opened:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode: count anyway.
    }
    void api.POST('/shares/{token}/open', { params: { path: { token } } });
  }, [token]);
}

/**
 * /s/:token — a shared place for anyone with the link (DM-45): what it is and who recommends it, then how to get in
 * (ask to join — the app is for people on the list) and install. Members go straight to the place.
 */
export function SharePage() {
  const { token } = useParams();
  const signedIn = !!useToken();
  const me = useMe();
  const share = useQuery({
    queryKey: ['share', token],
    queryFn: () => unwrap(api.GET('/shares/{token}', { params: { path: { token: token ?? '' } } })),
    enabled: !!token,
    retry: false,
  });
  useCountOpen(share.data ? token : undefined);

  if (signedIn && me.data?.has_profile && share.data) return <Navigate to={`/places/${share.data.place.id}`} replace />;
  if (share.isLoading || (signedIn && me.isLoading)) return <p className="page label">Ładowanie…</p>;
  if (!share.data)
    return (
      <div className="page narrow share-page">
        <Brand />
        <h1 className="title">Ten link już nie działa</h1>
        <p>
          Miejsce mogło zostać zamknięte albo usunięte. <Link to="/o-aplikacji">Czym jest Dobre Mleko?</Link>
        </p>
      </div>
    );

  const { place, shared_by: by } = share.data;
  const who = by.badge ? `${by.display_name} („${by.badge}”)` : by.display_name;
  return (
    <div className="page narrow share-page">
      <Brand />
      <p className="label share-by">Poleca Ci {who}</p>
      {place.cover_url && (
        <img
          className="share-cover"
          src={place.cover_url}
          alt=""
          width={place.cover_width ?? undefined}
          height={place.cover_height ?? undefined}
        />
      )}
      <p className="label">
        <CategoryMark category={place.category_id} size={12} /> {place.category_label}
      </p>
      <h1 className="display share-name">{place.name}</h1>
      {place.address && <p className="label">{place.address}</p>}
      <section className="place-scores">
        <div className="panel score-box">
          <span className="label">Ocena przyjaciół</span>
          <span className="numeral">{rating(place.rating_avg)}</span>
          <span className="data">
            z 5 · {place.rating_count} {plural(place.rating_count, ['ocena', 'oceny', 'ocen'])}
            {by.rating != null && ` · ${by.display_name}: ${rating(by.rating)}`}
          </span>
        </div>
        <div className="panel score-box gold-box">
          <span className="label">Złote gwiazdki</span>
          <span className="numeral">{place.gold_star_count}</span>
          <span className="data">tylko 3 na miesiąc na osobę</span>
        </div>
      </section>

      <section className="share-pitch">
        <h2 className="title">Dobre Mleko</h2>
        <p>
          Aplikacja, w której przyjaciele polecają sobie miejsca — kawiarnie, knajpy, bary. Zamiast tysięcy anonimowych
          opinii widzisz oceny ludzi, których znasz. Bez reklam i śledzenia.
        </p>
      </section>

      <JoinSteps token={share.data.token} placeId={place.id} />
    </div>
  );
}

function JoinSteps({ token, placeId }: { token: string; placeId: string }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const ask = useMutation({
    mutationFn: () => unwrap(api.POST('/join-requests', { body: { name, email, share_token: token } })),
    onError: toast.fail,
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask.mutate();
  };
  const on = device();
  const android = (
    <a className="btn btn-primary" href={playUrlForShare(token)}>
      Pobierz z Google Play
    </a>
  );
  const iphone = (
    <Link className={on === 'ios' ? 'btn btn-primary' : 'btn btn-secondary'} to="/o-aplikacji#iphone">
      iPhone — TestFlight
    </Link>
  );

  return (
    <ol className="share-steps">
      <li>
        <h2 className="title">Poproś o dostęp</h2>
        {ask.data?.status === 'pending' ? (
          <p className="notice" role="status">
            Gotowe — prośba wysłana. Gdy dodamy Cię do listy, zaloguj się adresem {email.trim().toLowerCase()}.
          </p>
        ) : ask.data?.status === 'allowed' ? (
          <p className="notice" role="status">
            Ten adres już jest na liście — zainstaluj aplikację i zaloguj się nim.
          </p>
        ) : (
          <form className="share-form" onSubmit={submit}>
            <p className="data muted">Na czas testów wchodzą osoby z listy. Zostaw adres, a dodamy Cię.</p>
            <div className="field">
              <label htmlFor="join-name">Imię</label>
              <input
                id="join-name"
                required
                maxLength={60}
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="join-email">
                {on === 'ios' ? 'E-mail Apple ID albo konta Google' : 'E-mail konta Google'}
              </label>
              <input
                id="join-email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={ask.isPending}>
              Chcę dołączyć
            </button>
          </form>
        )}
      </li>
      <li>
        <h2 className="title">Zainstaluj</h2>
        <div className="share-install">
          {on === 'ios' ? (
            iphone
          ) : on === 'android' ? (
            android
          ) : (
            <>
              {android}
              {iphone}
            </>
          )}
        </div>
        <p className="data muted">
          Albo bez instalacji: <Link to={`/places/${placeId}`}>otwórz w przeglądarce</Link> i zaloguj się.
        </p>
      </li>
    </ol>
  );
}
