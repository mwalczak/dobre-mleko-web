import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap } from '../shared/api';
import { useCategories } from '../shared/categories';
import { Brand } from '../shared/components/Brand';
import { SignIn } from '../shared/components/SignIn';
import { number } from '../shared/format';
import { signOut, useMe, useSessionReset, useToken } from '../shared/session';
import { Categories } from './Categories';
import { Icons } from './Icons';
import { JoinRequests, usePendingJoinRequests } from './JoinRequests';
import { Places } from './Places';
import { Push } from './Push';
import { People } from './People';
import { Settings } from './Settings';

export function AdminApp() {
  useSessionReset();
  useCategories();
  const token = useToken();
  const me = useMe();

  return (
    <>
      <header className="topbar">
        <Brand tag="Admin" href="/admin/" />
        {me.data && (
          <div className="topbar-who">
            <a href="/">Aplikacja</a>
            <span>{me.data.display_name}</span>
            <button type="button" className="btn btn-secondary btn-small" onClick={signOut}>
              Wyloguj
            </button>
          </div>
        )}
      </header>
      {!token ? (
        <section className="panel admin-gate">
          <h1 className="display">
            Panel
            <br />
            admina
          </h1>
          <p>Zaloguj się kontem Google z rolą admina.</p>
          <SignIn />
        </section>
      ) : me.isLoading ? (
        <p className="admin-main label">Ładowanie…</p>
      ) : !me.data?.is_admin ? (
        <section className="panel admin-gate">
          <h1 className="display">Brak dostępu</h1>
          <p>To konto nie ma roli admina.</p>
          <a className="btn btn-secondary" href="/">
            Do aplikacji
          </a>
        </section>
      ) : (
        <Dashboard myEmail={me.data.email} />
      )}
    </>
  );
}

function Dashboard({ myEmail }: { myEmail: string }) {
  const [tab, setTab] = useState<'people' | 'requests' | 'places' | 'push' | 'categories' | 'icons' | 'settings'>(
    'people',
  );
  const waiting = usePendingJoinRequests();
  const stats = useQuery({ queryKey: ['stats', 'network'], queryFn: () => unwrap(api.GET('/stats/network')) });
  const s = stats.data;
  return (
    <main className="admin-main">
      <dl className="tiles">
        {(
          [
            ['Osoby', s?.members],
            ['Miejsca', s?.places],
            ['Oceny', s?.ratings],
            ['Gwiazdki w tym mies.', s?.gold_stars_this_month],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value == null ? '—' : number(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="tabs" role="tablist" aria-label="Sekcje">
        {(
          [
            ['people', 'Ludzie'],
            ['requests', waiting ? `Prośby (${waiting})` : 'Prośby'],
            ['places', 'Miejsca'],
            ['push', 'Powiadomienia'],
            ['categories', 'Kategorie'],
            ['icons', 'Ikony'],
            ['settings', 'Ustawienia'],
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
      {tab === 'people' ? (
        <People myEmail={myEmail} />
      ) : tab === 'requests' ? (
        <JoinRequests />
      ) : tab === 'places' ? (
        <Places />
      ) : tab === 'push' ? (
        <Push />
      ) : tab === 'categories' ? (
        <Categories />
      ) : tab === 'icons' ? (
        <Icons />
      ) : (
        <Settings />
      )}
    </main>
  );
}
