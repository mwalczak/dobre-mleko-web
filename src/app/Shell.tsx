import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router-dom';
import { Avatar } from '../shared/components/Avatar';
import { useCategories } from '../shared/categories';
import { Brand } from '../shared/components/Brand';
import { SignIn } from '../shared/components/SignIn';
import { useMe, useSessionReset, useToken } from '../shared/session';
import { ReportFab } from './components/ReportFab';
import { OnboardingPage } from './pages/OnboardingPage';

const NAV = [
  { to: '/', label: 'Odkrywaj', end: true },
  { to: '/map', label: 'Mapa' },
  { to: '/add', label: 'Dodaj' },
  { to: '/stats', label: 'Staty' },
  { to: '/me', label: 'Ja' },
];

/** Signed out → manifest and sign-in; profile unfinished → onboarding; else the app with its navigation. */
export function Shell() {
  useSessionReset();
  useCategories();
  const token = useToken();
  const me = useMe();

  if (!token) return <Welcome />;
  if (me.isLoading) return <p className="page label">Ładowanie…</p>;
  if (me.isError || !me.data) return <Welcome />;
  if (!me.data.has_profile) return <OnboardingPage me={me.data} />;

  return (
    <>
      <header className="topbar app-topbar">
        <Brand />
        <nav className="nav-top" aria-label="Główne">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/me" className="topbar-me" aria-label="Mój profil">
          <Avatar name={me.data.display_name} url={me.data.avatar_url} size={36} ring="me" />
        </NavLink>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <ReportFab />
      <nav className="nav-bottom" aria-label="Główne">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
            <span className={`nav-dot nav-${n.label.toLowerCase()}`} aria-hidden="true" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <ScrollRestoration />
    </>
  );
}

function Welcome() {
  return (
    <main className="welcome">
      <div className="welcome-shapes" aria-hidden="true">
        <span className="ws-circle" />
        <span className="ws-square" />
        <span className="ws-triangle" />
      </div>
      <p className="label">Dobre Mleko · est. 2026 · Rybnik</p>
      <h1 className="welcome-title">
        Tylko
        <br />
        przy—
        <br />
        jaciele.
        <br />
        <span>
          Tylko
          <br />
          dobre
          <br />
          miejsca.
        </span>
      </h1>
      <p className="label">Wstęp tylko dla osób z listy</p>
      <SignIn />
      <p className="label welcome-links">
        <Link to="/privacy">Prywatność</Link> · <Link to="/usun-konto">Usuń konto</Link>
      </p>
    </main>
  );
}
