const pl = 'pl-PL';

/** 4.33 → "4,3" (ratings are shown with one decimal, Polish comma). */
export const rating = (value: number | null | undefined) =>
  value == null ? '—' : new Intl.NumberFormat(pl, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

export const number = (value: number) => new Intl.NumberFormat(pl).format(value);

/** 1234 m → "1,2 KM", 640 m → "640 M". */
export function distance(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} M`;
  return `${new Intl.NumberFormat(pl, { maximumFractionDigits: 1 }).format(meters / 1000)} KM`;
}

/** Polish plural: plural(5, ['ocena', 'oceny', 'ocen']) → "ocen". */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

export const count = (n: number, forms: [string, string, string]) => `${number(n)} ${plural(n, forms)}`;

export const date = (iso: string) => new Intl.DateTimeFormat(pl, { dateStyle: 'medium' }).format(new Date(iso));

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat(pl, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/** A calendar day ('YYYY-MM-DD', no time zone) → "12 PAŹ 2026", like the apps' `meta` style. */
export function day(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(pl, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(y!, m! - 1, d!))
    .replace('.', '')
    .toUpperCase();
}

/** Today here, as 'YYYY-MM-DD' (the latest a visit can be). */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "dziś", "wczoraj", "3 dni temu", "2 tyg. temu", else the date. */
export function ago(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 14) return `${days} dni temu`;
  if (days < 60) return `${Math.floor(days / 7)} tyg. temu`;
  return date(iso);
}

export const PRICE = ['', '$', '$$', '$$$', '$$$$'];
