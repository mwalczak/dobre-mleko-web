import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Shape } from '../shared/categories';
import { api, unwrap, type Schemas } from '../shared/api';

export type Report = Schemas['Report'];
export type ReportType = Report['type'];
export type ReportStatus = Report['status'];

/** Each type has a shape and a colour: colour never carries meaning alone. */
export const REPORT_TYPES: Record<ReportType, { label: string; shape: Shape; color: string; placeholder: string }> = {
  bug: {
    label: 'Błąd',
    shape: 'square',
    color: '#d7301f',
    placeholder: 'Co się stało? Co robiłeś/aś, czego się spodziewałeś/aś? Telefon czy komputer?',
  },
  idea: {
    label: 'Pomysł',
    shape: 'circle',
    color: '#f2b900',
    placeholder: 'Co by się przydało i do czego?',
  },
  abuse: {
    label: 'Nadużycie',
    shape: 'triangle',
    color: '#1d4fa0',
    placeholder: 'Kto lub co? Gdzie to widać — w którym miejscu, ocenie albo komentarzu?',
  },
};

export const REPORT_STATUS: Record<ReportStatus, string> = {
  reported: 'Zgłoszone',
  accepted: 'Przyjęte',
  in_progress: 'W toku',
  done: 'Zrobione',
  wont_fix: 'Nie zrobimy',
  duplicate: 'Duplikat',
};

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
