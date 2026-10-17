// Typed client for the Dobre Mleko API. Types come from the API's OpenAPI document (`npm run api:types`).
// In the browser the API lives under /api on the same origin (nginx in production, Vite's proxy in development).
import createClient, { type Middleware } from 'openapi-fetch';
import type { components, paths } from './api-schema';
import { getToken, setToken } from './auth';

export type Schemas = components['schemas'];
export type Profile = Schemas['Profile'];
export type Me = Schemas['Me'];
export type Session = Schemas['Session'];
export type Meta = Schemas['Meta'];
export type PlaceSummary = Schemas['PlaceSummary'];
export type PlaceDetail = Schemas['PlaceDetail'];
export type PlaceList = Schemas['PlaceList'];
export type Photo = Schemas['Photo'];
export type Comment = Schemas['Comment'];
export type Scores = Schemas['Scores'];
export type NetworkStats = Schemas['NetworkStats'];
export type MyStats = Schemas['MyStats'];
export type AllowedEmail = Schemas['AllowedEmail'];
export type Setting = Schemas['Setting'];
export type Category = PlaceSummary['category_id'];
export type CardStyle = Schemas['CardStyle'];

export const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const auth: Middleware = {
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set('authorization', `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    // The session expired or was revoked: sign out everywhere.
    if (response.status === 401 && getToken()) setToken(null);
    return response;
  },
};

export const api = createClient<paths>({ baseUrl: API_BASE });
api.use(auth);

/** Returns the data or throws an ApiError with the API's `{ error, message }`. */
export async function unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok || error !== undefined) {
    const body = (error ?? {}) as { error?: string; message?: string };
    throw new ApiError(response.status, body.error ?? 'error', body.message ?? response.statusText, body);
  }
  return data as T;
}

/** multipart/form-data upload (POST /photos, PUT /me/avatar). */
export async function uploadImage<T>(path: '/photos' | '/me/avatar', file: Blob, blurhash?: string): Promise<T> {
  const form = new FormData();
  if (blurhash) form.append('blurhash', blurhash);
  form.append('file', file, 'photo.jpg');
  const token = getToken();
  const response = await fetch(API_BASE + path, {
    method: path === '/photos' ? 'POST' : 'PUT',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) setToken(null);
    throw new ApiError(response.status, body.error ?? 'error', body.message ?? response.statusText, body);
  }
  return body as T;
}

/** multipart/form-data POST of fields and files (POST /reports); returns the JSON or throws an ApiError. */
export async function postForm<T>(path: '/reports', form: FormData): Promise<T> {
  const token = getToken();
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) setToken(null);
    throw new ApiError(response.status, body.error ?? 'error', body.message ?? response.statusText, body);
  }
  return body as T;
}
