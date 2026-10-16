import { describe, expect, it } from 'vitest';
import { ago, count, day, distance, plural, rating, today } from './format';

describe('format', () => {
  it('shows ratings with one decimal and a Polish comma', () => {
    expect(rating(4.33)).toBe('4,3');
    expect(rating(5)).toBe('5,0');
    expect(rating(null)).toBe('—');
  });

  it('rounds distances to tens of metres, then kilometres', () => {
    expect(distance(644)).toBe('640 M');
    expect(distance(1234)).toBe('1,2 KM');
    expect(distance(null)).toBeNull();
  });

  it('picks the Polish plural form', () => {
    const forms: [string, string, string] = ['ocena', 'oceny', 'ocen'];
    expect([1, 2, 4, 5, 12, 14, 22, 25, 112].map((n) => plural(n, forms))).toEqual([
      'ocena',
      'oceny',
      'oceny',
      'ocen',
      'ocen',
      'ocen',
      'oceny',
      'ocen',
      'ocen',
    ]);
    expect(count(0, forms)).toBe('0 ocen');
  });

  it('says how long ago', () => {
    const now = new Date('2026-10-12T12:00:00Z');
    expect(ago('2026-10-12T08:00:00Z', now)).toBe('dziś');
    expect(ago('2026-10-11T08:00:00Z', now)).toBe('wczoraj');
    expect(ago('2026-10-07T12:00:00Z', now)).toBe('5 dni temu');
    expect(ago('2026-09-21T12:00:00Z', now)).toBe('3 tyg. temu');
  });

  it('shows a calendar day with an upper-case month', () => {
    expect(day('2026-10-12')).toBe('12 PAŹ 2026');
    expect(day('2026-01-01')).toBe('1 STY 2026');
  });

  it('gives today as YYYY-MM-DD in local time', () => {
    expect(today(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
