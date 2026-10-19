import { useState } from 'react';
import { today } from '../../shared/format';
import { useMeta } from '../../shared/session';

const pl = 'pl-PL';
const WEEKDAYS = ['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parts = (date: string) => date.split('-').map(Number) as [number, number, number];

/** The visit date range: from a year ago (`oldest_visit_date` in /meta, as the API checks it) to today. */
export function useVisitRange(): { min: string; max: string } {
  const meta = useMeta().data;
  const max = today();
  const [y, m, d] = parts(max);
  return { min: meta?.oldest_visit_date ?? iso(y - 1, m, m === 2 && d === 29 ? 28 : d), max };
}

/** A calendar day ('YYYY-MM-DD') → "12 października 2026". */
export function longDay(date: string): string {
  const [y, m, d] = parts(date);
  return new Intl.DateTimeFormat(pl, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
}

/**
 * A month of days to pick one from, between [min] and [max] ('YYYY-MM-DD'). Unlike the browser's date picker, there is
 * no separate month or year choice that looks like picking a date but is not (DM-27): only a day sets the value; the
 * arrows change the month, within the range.
 */
export function DateCalendar({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  label: string;
}) {
  const start = parts(value || max);
  const [month, setMonth] = useState({ y: start[0], m: start[1] });
  const key = (y: number, m: number) => y * 12 + m;
  const [minY, minM] = parts(min);
  const [maxY, maxM] = parts(max);
  const canBack = key(month.y, month.m) > key(minY, minM);
  const canForward = key(month.y, month.m) < key(maxY, maxM);
  const shift = (by: number) => {
    const k = key(month.y, month.m) + by - 1;
    setMonth({ y: Math.floor(k / 12), m: (k % 12) + 1 });
  };

  const days = new Date(month.y, month.m, 0).getDate();
  const lead = (new Date(month.y, month.m - 1, 1).getDay() + 6) % 7; // Monday first
  const title = new Intl.DateTimeFormat(pl, { month: 'long', year: 'numeric' }).format(new Date(month.y, month.m - 1));

  return (
    <div className="calendar" role="group" aria-label={label}>
      <div className="calendar-head">
        <button
          type="button"
          className="calendar-nav"
          aria-label="Poprzedni miesiąc"
          disabled={!canBack}
          onClick={() => shift(-1)}
        >
          ‹
        </button>
        <span className="calendar-title" aria-live="polite">
          {title}
        </span>
        <button
          type="button"
          className="calendar-nav"
          aria-label="Następny miesiąc"
          disabled={!canForward}
          onClick={() => shift(1)}
        >
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar-weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = iso(month.y, month.m, i + 1);
          return (
            <button
              key={date}
              type="button"
              className="calendar-day"
              aria-label={longDay(date)}
              aria-pressed={date === value}
              aria-current={date === max ? 'date' : undefined}
              disabled={date < min || date > max}
              onClick={() => onChange(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
