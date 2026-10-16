import { describe, expect, it } from 'vitest';
import { distance, isGoogleMapsLink, sameName } from './mapsLink';

describe('matching a Google place in OpenStreetMap', () => {
  it('compares names loosely', () => {
    expect(sameName('Kawiarnia Relaks', 'Relaks – kawiarnia')).toBe(true);
    expect(sameName('Pizzeria Roma', 'Roma')).toBe(true);
    expect(sameName('Łódź Kaliska Bistro', 'lodz kaliska')).toBe(true);
    expect(sameName('Kawiarnia Relaks', 'Bar Mleczny Pod Lipą')).toBe(false);
    expect(sameName('', 'x')).toBe(false);
  });

  it('measures metres', () => {
    expect(Math.round(distance({ lat: 50, lng: 18 }, { lat: 50.001, lng: 18 }))).toBe(111);
  });
});

describe('Google Maps links', () => {
  it('tells them from other links', () => {
    expect(isGoogleMapsLink('https://maps.app.goo.gl/xTag6qQGCPnVboTDA')).toBe(true);
    expect(isGoogleMapsLink('https://www.google.com/maps/place/Relaks/@52.2,21.0,17z')).toBe(true);
    expect(isGoogleMapsLink('https://www.google.pl/maps?q=52.2,21.0')).toBe(true);
    expect(isGoogleMapsLink('https://goo.gl/maps/abc')).toBe(true);
    expect(isGoogleMapsLink('https://halagwardii.pl')).toBe(false);
    expect(isGoogleMapsLink('https://www.google.com/search?q=relaks')).toBe(false);
    expect(isGoogleMapsLink('nie link')).toBe(false);
    expect(isGoogleMapsLink(null)).toBe(false);
  });
});
