import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Shape } from '../shared/categories';
import { api, unwrap, type Schemas } from '../shared/api';

export type Report = Schemas['Report'];
export type CreatedReport = Schemas['CreatedReport'];
export type ReportChoice = Schemas['ReportChoice'];

/** This client's platform, preselected when the project offers it. */
export const CLIENT_PLATFORM = 'web';
/** As the API allows (POST /reports). */
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/**
 * How known issue types look: a shape and colour (never colour alone) and a hint. Which types exist and their labels
 * come from PMO (GET /reports/options); a type not listed here gets a plain mark.
 */
const TYPE_LOOK: Record<string, { shape: Shape; color: string; placeholder: string }> = {
  bug: {
    shape: 'square',
    color: '#d7301f',
    placeholder: 'Co się stało? Co robiłeś/aś, czego się spodziewałeś/aś? Telefon czy komputer?',
  },
  idea: { shape: 'circle', color: '#f2b900', placeholder: 'Co by się przydało i do czego?' },
  abuse: {
    shape: 'triangle',
    color: '#1d4fa0',
    placeholder: 'Kto lub co? Gdzie to widać — w którym miejscu, ocenie albo komentarzu?',
  },
};
const PLAIN_LOOK = { shape: 'quarter' as Shape, color: '#5e5a53', placeholder: 'Opisz, o co chodzi.' };

export const typeLook = (id: string) => TYPE_LOOK[id] ?? PLAIN_LOOK;

/** Abuse reports are private in PMO: never listed, so nothing to compare them with. */
export const isPrivateType = (id: string) => id === 'abuse';

const REPORT_STATUS: Record<string, string> = {
  reported: 'Zgłoszone',
  accepted: 'Przyjęte',
  in_progress: 'W toku',
  in_review: 'W przeglądzie',
  waiting_for_release: 'Czeka na wydanie',
  done: 'Zrobione',
  wont_fix: 'Nie zrobimy',
  duplicate: 'Duplikat',
};

/** The status as people should read it; one PMO adds later shows as it is until it gets a label here. */
export const statusLabel = (status: string) => REPORT_STATUS[status] ?? status.replaceAll('_', ' ');

/** The issue types and platforms to offer, with labels, as configured in PMO. */
export function useReportOptions() {
  return useQuery({
    queryKey: ['reports', 'options'],
    queryFn: () => unwrap(api.GET('/reports/options')),
    staleTime: 5 * 60_000,
  });
}

export const labelOf = (choices: ReportChoice[] | undefined, id: string | null) =>
  (id && choices?.find((c) => c.id === id)?.label) ?? id ?? '';

/** Public reports matching what is being typed, to spot one that already exists. */
export function useSimilarReports(q: string) {
  return useQuery({
    queryKey: ['reports', 'similar', q],
    queryFn: ({ signal }) => unwrap(api.GET('/reports', { params: { query: { q, limit: 5 } }, signal })),
    enabled: q.length >= 3,
    staleTime: 60_000,
    retry: false,
  });
}

export function useReports(status: 'open' | 'closed') {
  return useInfiniteQuery({
    queryKey: ['reports', 'list', status],
    queryFn: ({ pageParam }) =>
      unwrap(api.GET('/reports', { params: { query: { status, offset: pageParam, limit: 30 } } })),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next_offset ?? undefined,
  });
}
