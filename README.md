# dobre-mleko-web

The web version of **Dobre Mleko** (place ratings, only from friends) and its **admin dashboard**, in one Vite
build that shares the design system ("Bauhaus Nowy"), the API client and the sign-in.

React 19 · TypeScript · Vite · React Router · TanStack Query · openapi-fetch · MapLibre (OpenFreeMap tiles).
The API is [dobre-mleko-be](https://github.com/mwalczak/dobre-mleko-be)
([API docs](https://mwalczak.github.io/dobre-mleko-be/)).

| Path                       | What                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                        | Odkrywaj: search (with matching tags to filter by), sort and filter places (filters live in the URL)                                                        |
| `/map`                     | Every place in view as a category-shaped marker; the "Chcę odwiedzić" layer (remembered) adds everyone's not yet visited wishlist items as yellow rings     |
| `/places/:id`              | A place: photos, scores per criterion, gold star, save, navigate, comments                                                                                  |
| `/places/:id/rate`         | Rate with the four criteria and at least one photo; optional visit date ("Kiedy byłeś?", seen only by the author)                                           |
| `/add`, `/places/:id/edit` | Add or edit a place: paste a Google Maps link, or find it by name or address (or click the map, drag the pin); tags with suggestions; card style            |
| `/stats`, `/me`            | Network and personal stats; profile, avatar, saved places, my ratings, the "Chcę odwiedzić" tile                                                            |
| `/me/wishlist`             | Chcę odwiedzić (S55): my list, to visit and visited, "+" adds                                                                                               |
| `/members/:id/wishlist`    | Another member's list (linked from wishlist items and place authors; the web has no member profile yet)                                                     |
| `/wishlist/new`, `…/edit`  | Add or edit a wishlist item (S32): name, point and address, description, link (a Google Maps link fills name and point)                                     |
| `/wishlist/:id`            | A wishlist item (S23): map, description, link; the owner marks it visited, adds it as a place (`/add?wishlist=:id`), edits or removes it                    |
| `/admin/`                  | Admin dashboard: the whitelist (Ludzie), places (Miejsca), push notifications (Powiadomienia), categories (Kategorie), icons (Ikony), settings (Ustawienia) |

Signed-out visitors see the manifest and the sign-in; first sign-in asks for a profile. The dashboard is only for
admins (others see "Brak dostępu"). Both use the same session (one token in `localStorage`), so signing in to one
signs in to the other.

## Run locally

Start Postgres and the API with fixtures and the development sign-in (in `dobre-mleko-be`, see its README):

```sh
cp .env.example .env    # has DEV_LOGIN=true
npm install
npm run seed            # 10 members, 100 Warsaw places
npm run dev             # http://localhost:8080
```

Then here:

```sh
npm ci
npm run dev          # http://localhost:5173, admin at http://localhost:5173/admin/
```

Sign in by e-mail as any seeded user, e.g. `kuba@example.com`, or `marta@example.com` (an admin). The dev server
proxies `/api/*` (prefix stripped) and `/files/*` to `API_URL` (default `http://localhost:8080`), the same way
nginx does in production, so the app always calls its own origin.

| Script              |                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Dev server with the API proxy                                                                                                   |
| `npm run build`     | Typecheck and build both pages into `dist/`                                                                                     |
| `npm run preview`   | Serve `dist/` on :4173 (with the proxy)                                                                                         |
| `npm test`          | Unit tests (vitest)                                                                                                             |
| `npm run test:e2e`  | Playwright smoke tests, desktop and phone (needs the seeded API with `DEV_LOGIN`; starts `npm run dev` unless `WEB_URL` is set) |
| `npm run api:types` | Regenerate `src/shared/api-schema.d.ts` from the published OpenAPI document (`API_SPEC=<path or URL>` for another one)          |
| `npm run format`    | Prettier                                                                                                                        |

The e2e tests change data (they add a place and ratings): run `npm run seed -- --reset` in the API to start over.

### Environment

| Variable            | When         |                                                                                                                |
| ------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `API_URL`           | dev, preview | Where the proxy sends `/api` and `/files` (default `http://localhost:8080`)                                    |
| `VITE_MAP_STYLE`    | build        | MapLibre style URL (default OpenFreeMap Positron); add its hosts to `MAP_ORIGINS`                              |
| `API_UPSTREAM`      | container    | The API for nginx (default `http://api.dobre-mleko.svc.cluster.local`)                                         |
| `MAP_ORIGINS`       | container    | Map hosts allowed by the CSP's `connect-src` (default `https://tiles.openfreemap.org`)                         |
| `VITE_GEOCODER_URL` | build        | Place and address search, a Photon server (default `https://photon.komoot.io`); set `GEOCODER_ORIGIN` to match |
| `GEOCODER_ORIGIN`   | container    | The search's origin for the CSP (default `https://photon.komoot.io`)                                           |

## Layout

```
index.html, admin/index.html   the two pages (Vite inputs)
src/
  shared/          API client (typed from the OpenAPI document), session, formatting, categories and their
                   Bauhaus shapes, photo resizing + blurhash, design tokens and base styles, shared components
  app/             the web app: Shell (sign-in, onboarding, navigation), pages, components (map, rating input…)
  admin/           the dashboard: people and settings
nginx/             nginx config template for the container
e2e/               Playwright smoke tests
```

**Categories** come from the API (`category_details` in `GET /meta`), so admins manage them in the dashboard:
name, colour (the card palette), shape (circle, half, triangle, triangle down, ring, square, quarter, house), order;
retired ones keep their places but are not offered for new ones, and a category without places can be deleted.
`src/shared/categories.ts` keeps them (with the first eleven built in until `/meta` arrives) and draws the shapes.

Each place has a **card style** chosen by its author (`card_style` in the API): the list card's layout (a = photo,
b = poster, c = photo in a circle, diagonal, ribbon, arch, wedge, or auto, which rotates a, b, c down the list), its colour (one of 16, or the
category's), and a photo filter (duotone, halftone, engraving, riso, xerox, hatch, mosaic, sunset) with its strength. The filter shows on the list
card and the place's main photo; the gallery keeps the originals. The colours and filters are in
`src/shared/cardStyle.ts` and `src/shared/components/PhotoEffect.tsx` (SVG and CSS filters drawn over the photo,
their opacity being the strength).

Photos are resized in the browser to at most 2048 px (JPEG) with a blurhash before upload, like the iOS app. The
map library (≈1 MB) is loaded only on the pages that show a map.

## Deploy

Same setup as the API: CI (`ci.yml`) runs the format check, typecheck, unit tests and build on every push and pull
request. When it passes on `main`, `deploy.yml` builds the image (nginx serving `dist/`), pushes it to GHCR and
applies `k8s.yaml` on the k3s server over SSH: a `web` Deployment, Service and Traefik ingress with a cert-manager
certificate, in the API's `dobre-mleko` namespace. nginx proxies `/api/*` and `/files/*` to the `api` service
inside the cluster, so the browser sees one origin; it also sets the CSP, long caching for hashed assets and the
fallbacks to `index.html` and `admin/index.html` for client-side routes.

- Repository secrets: `VPS_HOST`, `VPS_SSH_KEY` (the same as the API's).
- Repository variable: `WEB_HOST`, the web app's domain, with a DNS record pointing at the server.
- Google sign-in: the API's `GOOGLE_WEB_CLIENT_ID` must list `https://<WEB_HOST>` as an authorised JavaScript
  origin.
- After the first run, make the GHCR package public or add an image pull secret.
