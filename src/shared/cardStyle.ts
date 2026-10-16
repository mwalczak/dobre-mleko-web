import type { CardStyle, Category } from './api';
import { categoryInfo } from './categories';

// How a place looks in lists and on its page, chosen by its author (card_style in the API).

export type CardColor = NonNullable<CardStyle['color']>;
export type CardLayout = Exclude<CardStyle['layout'], 'auto'>;
export type PhotoFilter = CardStyle['photo_filter'];

/** The 16 card colours: the API's names, values from the apps' design tokens (design/tokens.json → cardColor). */
export const CARD_COLORS: Record<CardColor, { label: string; hex: string }> = {
  red: { label: 'Czerwony', hex: '#D7301F' },
  blue: { label: 'Niebieski', hex: '#1D4FA0' },
  yellow: { label: 'Żółty', hex: '#F2B900' },
  ink: { label: 'Czarny', hex: '#141414' },
  orange: { label: 'Pomarańczowy', hex: '#EE7623' },
  pink: { label: 'Różowy', hex: '#E9799E' },
  green: { label: 'Zielony', hex: '#1E6B45' },
  teal: { label: 'Morski', hex: '#0F6E7A' },
  sky: { label: 'Błękitny', hex: '#7DB4E0' },
  navy: { label: 'Granatowy', hex: '#1C2B4F' },
  violet: { label: 'Fioletowy', hex: '#5A3A8C' },
  ochre: { label: 'Ochra', hex: '#C99A2E' },
  brick: { label: 'Ceglany', hex: '#8E2F1D' },
  olive: { label: 'Oliwkowy', hex: '#5F6B23' },
  sand: { label: 'Piaskowy', hex: '#DCCAA5' },
  stone: { label: 'Kamienny', hex: '#8C877D' },
};

export const CARD_COLOR_IDS = Object.keys(CARD_COLORS) as CardColor[];

export const LAYOUTS: Record<CardStyle['layout'], { label: string; hint: string }> = {
  auto: { label: 'Auto', hint: 'Układ zmienia się na liście' },
  a: { label: 'Zdjęcie', hint: 'Zdjęcie na całą szerokość' },
  b: { label: 'Plakat', hint: 'Kolor i kształt, bez zdjęcia' },
  c: { label: 'Koło', hint: 'Zdjęcie w kole' },
  diagonal: { label: 'Ukos', hint: 'Zdjęcie ścięte trójkątem koloru' },
  ribbon: { label: 'Wstęga', hint: 'Kolor przecięty ukośną wstęgą z nazwą, bez zdjęcia' },
  arch: { label: 'Łuk', hint: 'Zdjęcie w łuku' },
  wedge: { label: 'Klin', hint: 'Kolor z nazwą, zdjęcie w równoległoboku' },
};

export const FILTERS: Record<PhotoFilter, string> = {
  none: 'Bez filtra',
  duotone: 'Duoton',
  halftone: 'Raster',
  engraving: 'Sztych',
  riso: 'Riso',
  xerox: 'Ksero',
  hatch: 'Kreskowanie',
  mosaic: 'Mozaika',
  sunset: 'Zachód',
};

export const DEFAULT_CARD_STYLE: CardStyle = {
  layout: 'auto',
  photo_filter: 'none',
  filter_intensity: 100,
  color: null,
};

export const PAPER = '#F1ECE2';
export const INK = '#141414';
export const YELLOW = '#F2B900';
export const RED = '#D7301F';

/** The warm band of the sunset filter: yellow, or red on a yellow card. */
export const warmFor = (color: string) => (color.toUpperCase() === YELLOW ? RED : YELLOW);

/** The card's main colour: the chosen one, else the category's. */
export const cardColor = (style: CardStyle | undefined, category: Category) =>
  style?.color ? CARD_COLORS[style.color].hex : categoryInfo(category).color;

const AUTO_ORDER: CardLayout[] = ['a', 'c', 'b'];
/** Layouts without a photo; every other one falls back to a poster when the place has no photo. */
const POSTERS: CardLayout[] = ['b', 'ribbon'];

/**
 * The layout to draw. `auto` rotates through a, c, b by position in the list (or by id outside lists); the photo
 * layouts need a photo, so without one the card is a poster (b).
 */
export function resolveLayout(style: CardStyle | undefined, hasPhoto: boolean, position: number | string): CardLayout {
  let layout = style?.layout ?? 'auto';
  if (layout === 'auto') {
    const n = typeof position === 'number' ? position : hash(position);
    layout = AUTO_ORDER[n % AUTO_ORDER.length]!;
  }
  return !POSTERS.includes(layout) && !hasPhoto ? 'b' : layout;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type Rgb = [number, number, number];

export const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => v + (b[i]! - v) * t) as Rgb;

/** WCAG relative luminance, 0–1. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ink or paper, whichever reads better on `hex`. */
export const textOn = (hex: string) => (luminance(hex) > 0.18 ? INK : PAPER);
