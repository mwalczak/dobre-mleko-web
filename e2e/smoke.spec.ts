import { expect, test, type Page } from '@playwright/test';

// Runs against the API with `npm run seed` data and DEV_LOGIN=true (see README).

const errors: string[] = [];

// Place search (Photon): canned answers, never the real service.
const photon = (properties: Record<string, unknown>, lng: number, lat: number) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { country: 'Polska', city: 'Warszawa', ...properties },
});
const SEARCH = [
  photon(
    {
      osm_type: 'N',
      osm_id: 1,
      osm_key: 'amenity',
      osm_value: 'cafe',
      name: 'Kawiarnia Relaks',
      street: 'Złota',
      housenumber: '8',
    },
    21.0071,
    52.2303,
  ),
  photon(
    { osm_type: 'W', osm_id: 2, osm_key: 'highway', osm_value: 'residential', type: 'street', name: 'Relaksowa' },
    21.05,
    52.2,
  ),
];
const REVERSE = [
  photon(
    {
      osm_type: 'N',
      osm_id: 3,
      osm_key: 'building',
      osm_value: 'yes',
      type: 'house',
      street: 'Marszałkowska',
      housenumber: '10',
    },
    21.01,
    52.23,
  ),
];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/photon\.komoot\.io/, (route) =>
    route.fulfill({
      json: { type: 'FeatureCollection', features: route.request().url().includes('/reverse') ? REVERSE : SEARCH },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
});

test.afterEach(() => {
  expect(errors, 'uncaught errors in the page').toEqual([]);
});

async function signIn(page: Page, email: string, path = '/') {
  await page.goto(path);
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Zaloguj' }).click();
}

/** A real JPEG, so the browser can resize it and compute the blurhash. */
async function jpeg(page: Page): Promise<Buffer> {
  const data = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#1D4FA0';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#F2B900';
    ctx.beginPath();
    ctx.arc(320, 240, 150, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL('image/jpeg', 0.9).split(',')[1]!;
  });
  return Buffer.from(data, 'base64');
}

test('signed out: the manifest and sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tylko');
  await expect(page.getByText('Logowanie deweloperskie')).toBeVisible();
});

test('discover, search, a place, stats and profile', async ({ page }) => {
  await signIn(page, 'kuba@example.com');
  await expect(page.getByRole('heading', { name: 'Odkrywaj' })).toBeVisible();
  const cards = page.locator('.place-card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(10);

  await page.getByLabel('Szukaj miejsc').fill('pawilon');
  await expect(page).toHaveURL(/q=pawilon/);
  await expect(cards.first()).toContainText(/pawilon/i);

  // Matching tags are offered while typing; picking one filters by it instead.
  await page.getByLabel('Szukaj miejsc').fill('weg');
  await page.getByRole('group', { name: 'Pasujące tagi' }).getByRole('button', { name: /Wege/ }).click();
  await expect(page).toHaveURL(/tags=Wege/);
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByLabel('Szukaj miejsc')).toHaveValue('');
  await expect(cards.first()).toBeVisible();
  await page.getByRole('group', { name: 'Tagi', exact: true }).getByRole('button', { name: /Wege/ }).click();
  await expect(page).not.toHaveURL(/tags=/);
  await page.getByLabel('Szukaj miejsc').fill('pawilon');
  await expect(cards.first()).toContainText(/pawilon/i);

  await cards.first().click();
  await expect(page.getByText('Ocena łączna')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Komentarze/ })).toBeVisible();

  await page.getByRole('link', { name: 'Staty' }).click();
  await expect(page.getByText('Top 10')).toBeVisible();
  await page.getByRole('tab', { name: 'Ja' }).click();
  await expect(page.getByText('Podobny gust')).toBeVisible();

  await page.getByRole('link', { name: 'Ja', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kuba' })).toBeVisible();
});

test('rate a place with a photo', async ({ page }) => {
  await signIn(page, 'ola@example.com', '/?unrated_only=true');
  await page.locator('.place-card').first().click();
  const name = await page.locator('.place-name').textContent();
  await page.getByRole('link', { name: 'Oceń' }).click();

  for (const label of ['Klimat: 5 na 5', 'Oferta: 4 na 5', 'Obsługa: 4 na 5']) {
    await page.getByRole('button', { name: label }).click();
  }
  await expect(page.getByRole('button', { name: 'Zapisz ocenę' })).toBeDisabled(); // no photo yet
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
  await expect(page.locator('.photo-picker-item img')).toHaveCount(1);
  await page.getByLabel('Kiedy byłeś?').fill('2026-10-12');
  await page.getByRole('button', { name: 'Zapisz ocenę' }).click();

  await expect(page.locator('.place-name')).toHaveText(name!);
  await expect(page.getByRole('link', { name: 'Zmień ocenę' })).toBeVisible();
  await expect(page.getByText('Byłem/am 12 PAŹ 2026')).toBeVisible();
});

test('add a place with rating, photo and map pin', async ({ page }) => {
  await signIn(page, 'tomek@example.com');
  await page.getByRole('link', { name: 'Dodaj' }).click();
  const name = `Testowa Kawiarnia ${Date.now()}`;
  await page.getByLabel('Nazwa').fill(name);
  await page.getByRole('button', { name: 'Kawa' }).click();
  const map = page.locator('.map-picker');
  await expect(map.locator('canvas')).toBeVisible();
  await map.click({ position: { x: 200, y: 150 } });
  await expect(page.getByText(/^52\.\d+, 2\d\.\d+$/)).toBeVisible();
  await page.getByLabel('Dlaczego warto').fill('Test end-to-end.');

  // Tags: a suggestion, one typed (closed by a comma) and a popular one for the category.
  const tagInput = page.getByRole('combobox', { name: 'Tagi' });
  await tagInput.fill('ogr');
  await page.getByRole('option', { name: /Ogródek/ }).click();
  await tagInput.fill('Testowy tag,');
  const chosen = page.getByRole('group', { name: 'Wybrane tagi' });
  await expect(chosen.getByRole('button')).toHaveText([/Ogródek/, /Testowy tag/]);
  await page.locator('.tag-popular .chip-suggest').first().click();
  await expect(chosen.getByRole('button')).toHaveCount(3);
  await page.getByRole('button', { name: 'Klimat: 4 na 5' }).click();
  await page.getByRole('button', { name: 'Oferta: 5 na 5' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
  await expect(page.locator('.photo-picker-item img')).toHaveCount(1);

  // Card style, with a live preview.
  await page.getByRole('button', { name: 'Koło' }).click();
  await page.getByRole('button', { name: 'Morski' }).click();
  await page.getByRole('button', { name: 'Raster' }).click();
  const preview = page.locator('.card-style-preview');
  await expect(preview.locator('[data-layout="c"]')).toBeVisible();
  await expect(preview.locator('.fx-halftone')).toBeVisible();

  await page.getByRole('button', { name: 'Dodaj miejsce' }).click();

  await expect(page.locator('.place-name')).toHaveText(name);
  await expect(page.getByText('Test end-to-end.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ogródek' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Testowy tag' })).toBeVisible();
  await expect(page.locator('.gallery-item').first().locator('.fx-halftone')).toBeVisible();

  await page.goto(`/?q=${encodeURIComponent(name)}`);
  await expect(page.locator('.place-card [data-layout="c"] .fx-halftone')).toBeVisible();
});

test('add a place from a Google Maps link', async ({ page }) => {
  const link =
    'https://www.google.com/maps/place/Kawiarnia+Relaks/@52.2303,21.0071,17z/data=!3m1!4b1!4m6!3m5!1s0x1:0x2!8m2!3d52.2303!4d21.0071?entry=ttu';
  await signIn(page, 'tomek@example.com', '/add');
  const input = page.getByLabel('Link z Google Maps');

  // Not a Maps link: a clear message, and the place form is not submitted.
  await input.fill('https://example.com/miejsce');
  await input.press('Enter');
  await expect(page.getByText('To nie wygląda na link do miejsca w Google Maps', { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/add$/);

  // The link fills name and pin; the same place in OpenStreetMap (mocked Photon) gives address and category.
  await input.fill(link);
  await page.getByRole('button', { name: 'Wczytaj' }).click();
  await expect(page.getByText(/Uzupełniono: nazwę, miejsce na mapie, adres, kategorię/)).toBeVisible();
  await expect(page.getByLabel('Nazwa')).toHaveValue('Kawiarnia Relaks');
  await expect(page.getByRole('button', { name: 'Kawa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Złota 8, Warszawa');
  await expect(page.getByText('52.23030, 21.00710')).toBeVisible();

  await page.getByRole('button', { name: 'Klimat: 5 na 5' }).click();
  await page.getByRole('button', { name: 'Oferta: 4 na 5' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
  await expect(page.locator('.photo-picker-item img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dodaj miejsce' }).click();
  await expect(page.locator('.place-name')).toHaveText('Kawiarnia Relaks');
  await expect(page.getByRole('link', { name: 'Google Maps' })).toHaveAttribute('href', link.replace('?entry=ttu', ''));

  // The same link again: the place already there is pointed out.
  await page.goto('/add');
  await page.getByLabel('Link z Google Maps').fill(link);
  await page.getByRole('button', { name: 'Wczytaj' }).click();
  await expect(page.getByText('Może to miejsce już jest w aplikacji?')).toBeVisible();
  await expect(
    page
      .locator('.maps-link-nearby')
      .getByRole('link', { name: /Kawiarnia Relaks/ })
      .first(),
  ).toBeVisible();
});

test('find a place by search, then move the pin', async ({ page }) => {
  await signIn(page, 'tomek@example.com', '/add');
  await page.getByLabel('Szukaj miejsca lub adresu').fill('relaks');
  await page.getByRole('option', { name: /Kawiarnia Relaks/ }).click();

  // Name, category, address and pin come from the result.
  await expect(page.getByLabel('Nazwa')).toHaveValue('Kawiarnia Relaks');
  await expect(page.getByRole('button', { name: 'Kawa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Złota 8, Warszawa');
  await expect(page.getByText('52.23030, 21.00710')).toBeVisible();

  // Dragging the pin replaces an address we filled in…
  const map = page.locator('.map-picker');
  const pin = map.locator('.maplibregl-marker');
  await expect(pin).toBeVisible();
  await map.scrollIntoViewIfNeeded();
  // Wait for the map to finish flying to the result: grab the pin only once it stays put.
  let box = (await pin.boundingBox())!;
  await expect
    .poll(async () => {
      const now = (await pin.boundingBox())!;
      const still = Math.abs(now.x - box.x) < 1 && Math.abs(now.y - box.y) < 1;
      box = now;
      return still;
    })
    .toBe(true);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Marszałkowska 10, Warszawa');
  await expect(page.getByText('52.23030, 21.00710')).toBeHidden();

  // …but never one the author typed.
  await page.getByLabel('Adres', { exact: true }).fill('Złota 8 (wejście od podwórza)');
  await map.click({ position: { x: 60, y: 60 } });
  await expect(page.getByText(/^52\.\d+, 2\d\.\d+$/)).toBeVisible();
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Złota 8 (wejście od podwórza)');

  // Keyboard: arrows and Enter pick, without submitting the form.
  await page.getByLabel('Szukaj miejsca lub adresu').fill('relaksowa');
  await page.getByLabel('Szukaj miejsca lub adresu').press('ArrowDown');
  await page.getByLabel('Szukaj miejsca lub adresu').press('Enter');
  await expect(page.getByText('52.20000, 21.05000')).toBeVisible();
  await expect(page).toHaveURL(/\/add$/);
});

test('change a place card style', async ({ page }) => {
  await signIn(page, 'marta@example.com', '/?sort=newest');
  await page.locator('.place-card').first().click();
  const name = (await page.locator('.place-name').textContent())!;
  await page.getByRole('link', { name: 'Edytuj' }).click();
  await page.getByRole('button', { name: 'Plakat' }).click();
  await page.getByRole('button', { name: 'Granatowy' }).click();
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(page.locator('.place-name')).toHaveText(name);

  await page.goto(`/?q=${encodeURIComponent(name)}`);
  const art = page.locator('.place-card').first().locator('[data-layout="b"]');
  await expect(art).toBeVisible();
  await expect(art).toHaveCSS('background-color', 'rgb(28, 43, 79)');
});

test('the map shows places', async ({ page }) => {
  await signIn(page, 'kuba@example.com');
  await page.getByRole('link', { name: 'Mapa' }).click();
  await expect(page.locator('.map-marker').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.map-marker').first().click();
  await expect(page.locator('.map-card .place-card')).toBeVisible();
});

test('wishlist: add a place to visit, mark it visited, then add it as a place', async ({ page }) => {
  const name = `Wymarzone miejsce ${Date.now()}`;
  await signIn(page, 'ola@example.com', '/me');
  await page.getByRole('link', { name: 'Dodaj do listy „Chcę odwiedzić”' }).click();
  await expect(page.getByRole('heading', { name: 'Chcę odwiedzić' })).toBeVisible();
  await page.getByLabel('Nazwa').fill(name);
  await page.getByLabel('Szukaj miejsca lub adresu').fill('relaks');
  await page.getByRole('option', { name: /Kawiarnia Relaks/ }).click();
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Złota 8, Warszawa');
  await expect(page.getByLabel('Nazwa')).toHaveValue(name); // a name we typed stays
  await page.getByLabel('Opis').fill('Podobno najlepsza szarlotka.');
  await page.getByLabel('Link').fill('https://example.com/relaks');
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click();

  // S23: the item, mine.
  await expect(page.locator('.place-name')).toHaveText(name);
  await expect(page.getByText('Podobno najlepsza szarlotka.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Link', exact: true })).toHaveAttribute(
    'href',
    'https://example.com/relaks',
  );
  await page.getByRole('button', { name: 'Odwiedzone', exact: true }).click();
  await page.getByLabel('Kiedy byłeś?').fill('2026-10-12');
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(page.locator('.wish-visited')).toHaveText('Odwiedzone 12 PAŹ 2026');

  // My list: in the visited section.
  await page.goto('/me/wishlist');
  await expect(page.getByRole('heading', { name: /Odwiedzone/ })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(name) }).click();

  // "Dodaj jako miejsce": the add form starts with the item.
  await page.getByRole('link', { name: 'Dodaj jako miejsce' }).click();
  await expect(page.getByLabel('Nazwa')).toHaveValue(name);
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Złota 8, Warszawa');
  await expect(page.getByLabel('Kiedy byłeś?')).toHaveValue('2026-10-12');
  await expect(page.getByText('52.23030, 21.00710')).toBeVisible();

  // Back on the item: not visited after all, then removed.
  await page.goBack();
  await page.getByRole('button', { name: 'Nie odwiedzone' }).click();
  await expect(page.getByRole('button', { name: 'Odwiedzone', exact: true })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Usuń' }).click();
  await expect(page).toHaveURL(/\/me\/wishlist$/);
  await expect(page.getByText(name)).toHaveCount(0);
});

test('wishlist: a Google Maps link fills the form', async ({ page }) => {
  const link =
    'https://www.google.com/maps/place/Kawiarnia+Relaks/@52.2303,21.0071,17z/data=!3m1!4b1!4m6!3m5!1s0x1:0x2!8m2!3d52.2303!4d21.0071?entry=ttu';
  await signIn(page, 'ola@example.com', '/wishlist/new');
  await page.getByLabel('Link').fill(link);
  await page.getByRole('button', { name: 'Wczytaj' }).click();
  await expect(page.getByText(/Uzupełniono: nazwę, miejsce na mapie, adres/)).toBeVisible();
  await expect(page.getByLabel('Nazwa')).toHaveValue('Kawiarnia Relaks');
  await expect(page.getByLabel('Adres', { exact: true })).toHaveValue('Złota 8, Warszawa');
  await expect(page.getByText('52.23030, 21.00710')).toBeVisible();
});

test('the map shows the wishlist layer', async ({ page }) => {
  await signIn(page, 'kuba@example.com', '/map');
  const layer = page.getByRole('button', { name: /Chcę odwiedzić/ });
  await layer.click();
  await expect(layer).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-marker-wish').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.map-marker-wish').first().click();
  await expect(page).toHaveURL(/\/wishlist\/[0-9a-f-]+$/);
  await expect(page.getByText(/Lista: |Twoja lista/)).toBeVisible();

  // Remembered.
  await page.goto('/map');
  await expect(page.getByRole('button', { name: /Chcę odwiedzić/ })).toHaveAttribute('aria-pressed', 'true');
});

test('admin dashboard', async ({ page }) => {
  await signIn(page, 'marta@example.com', '/admin/');
  await expect(page.getByRole('tab', { name: 'Ludzie' })).toBeVisible();
  await expect(page.locator('table.people tbody tr')).toHaveCount(11); // 10 members + ADMIN_EMAILS
  await page.getByRole('tab', { name: 'Ustawienia' }).click();
  await expect(page.getByLabel('Złote gwiazdki na miesiąc')).toBeVisible();

  // Same origin, same session: the app is signed in too.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Odkrywaj' })).toBeVisible();
});

test('admin manages categories, and the app follows', async ({ page }, info) => {
  const label = `Sauna ${info.project.name}`;
  await signIn(page, 'marta@example.com', '/admin/');
  await page.getByRole('tab', { name: 'Kategorie' }).click();
  await expect(page.getByRole('listitem', { name: 'Hotel' })).toBeVisible();

  // Add: the id follows the name.
  await page.getByLabel('Nazwa').fill(label);
  await expect(page.getByLabel('Identyfikator')).toHaveValue(`sauna_${info.project.name}`);
  await page.getByRole('button', { name: 'Morski' }).click();
  await page.getByRole('button', { name: 'Domek' }).click();
  await page.getByRole('button', { name: 'Dodaj kategorię' }).click();
  const row = page.getByRole('listitem', { name: label });
  await expect(row).toContainText('0 miejsc');

  // The app offers it for new places…
  await page.goto('/add');
  await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();

  // …until it is retired.
  await page.goto('/admin/');
  await page.getByRole('tab', { name: 'Kategorie' }).click();
  await row.getByRole('button', { name: 'Wycofaj' }).click();
  await expect(row).toContainText('Wycofana');
  await page.goto('/add');
  await expect(page.getByRole('button', { name: 'Kawa', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);

  // Rename, reorder and delete.
  await page.goto('/admin/');
  await page.getByRole('tab', { name: 'Kategorie' }).click();
  await row.getByRole('button', { name: 'Edytuj' }).click();
  await row.getByLabel('Nazwa').fill(`${label} i basen`);
  await row.getByRole('button', { name: 'Zapisz' }).click();
  const renamed = page.getByRole('listitem', { name: `${label} i basen` });
  await expect(renamed).toBeVisible();
  await renamed.getByRole('button', { name: /wyżej/ }).click();
  await expect(renamed.getByRole('button', { name: /wyżej/ })).toBeEnabled();
  page.once('dialog', (d) => d.accept());
  await renamed.getByRole('button', { name: 'Usuń' }).click();
  await expect(renamed).toHaveCount(0);

  // A category with places can only be retired.
  await expect(page.getByRole('listitem', { name: 'Kawa' }).getByRole('button', { name: 'Usuń' })).toBeDisabled();
});

test('members cannot use the dashboard', async ({ page }) => {
  await signIn(page, 'kuba@example.com', '/admin/');
  await expect(page.getByRole('heading', { name: 'Brak dostępu' })).toBeVisible();
});
