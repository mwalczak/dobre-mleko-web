import { Link, useLocation } from 'react-router-dom';

/** While the apps are being tested: on every screen, a button to report a bug or an idea. Set to false to hide it. */
export const SHOW_REPORT_FAB = true;

const LABEL = 'Zgłoś błąd lub pomysł';

/** Floating button to /report (not shown on /report itself). */
export function ReportFab() {
  const { pathname } = useLocation();
  if (!SHOW_REPORT_FAB || pathname === '/report') return null;
  return (
    <Link
      to="/report"
      className={pathname === '/map' ? 'report-fab on-map' : 'report-fab'}
      aria-label={LABEL}
      title={LABEL}
    >
      <BugBulb />
    </Link>
  );
}

/** A light bulb that is also a bug: the glass is its body (wings split down the middle), with a head, feelers and bent
 * legs; the bulb's screw is its tail end. */
export function BugBulb({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" fill="none">
        <path d="M9 12 L5.5 10.5 L4 7 M8 16.5 H4.5 L2.5 19 M10 21 L7 23 L6.5 27" />
        <path d="M23 12 L26.5 10.5 L28 7 M24 16.5 H27.5 L29.5 19 M22 21 L25 23 L25.5 27" />
        <path d="M14 5 L12 1.5 M18 5 L20 1.5" />
      </g>
      <path d="M12.5 7.5 A3.5 3.5 0 0 1 19.5 7.5 Z" fill="currentColor" />
      <circle cx="16" cy="16" r="8" fill="var(--yellow)" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 8.5 V23.5" stroke="currentColor" strokeWidth="2" />
      <rect x="12.5" y="25" width="7" height="2.5" fill="currentColor" />
      <rect x="13.5" y="28.5" width="5" height="2.5" fill="currentColor" />
    </svg>
  );
}
