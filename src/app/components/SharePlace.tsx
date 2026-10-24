import { useMutation } from '@tanstack/react-query';
import { api, unwrap, type PlaceDetail } from '../../shared/api';
import { useToast } from '../../shared/components/Toast';
import { rating } from '../../shared/format';
import { shareText } from '../../shared/links';

/**
 * „Udostępnij” on a place (DM-45): gets my link to it, then offers the system share sheet (phones), WhatsApp and
 * copying. The link shows anyone a preview of the place and how to join.
 */
export function SharePlace({ place }: { place: PlaceDetail }) {
  const toast = useToast();
  const link = useMutation({
    mutationFn: () => unwrap(api.POST('/places/{id}/shares', { params: { path: { id: place.id } } })),
    onError: toast.fail,
  });
  const url = link.data?.url;
  const text = url ? shareText(place.name, place.rating_avg == null ? null : rating(place.rating_avg), url) : '';
  const canShare = typeof navigator.share === 'function';

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.ok('Skopiowano — wklej w wiadomości.');
    } catch {
      toast.ok('Zaznacz link i skopiuj go ręcznie.');
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        aria-expanded={!!url}
        disabled={link.isPending}
        onClick={() => (url ? link.reset() : link.mutate())}
      >
        Udostępnij
      </button>
      {url && (
        <div className="panel share-panel" role="region" aria-label="Udostępnij miejsce">
          <span className="label">Wyślij przyjaciołom</span>
          <span className="share-panel-link">{url}</span>
          <div className="share-panel-actions">
            {canShare && (
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => navigator.share({ title: place.name, text }).catch(() => undefined)}
              >
                Udostępnij…
              </button>
            )}
            <a
              className="btn btn-secondary btn-small"
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <button type="button" className="btn btn-secondary btn-small" onClick={copy}>
              Kopiuj
            </button>
          </div>
          <span className="data muted">Każdy z linkiem zobaczy to miejsce i może poprosić o dołączenie.</span>
        </div>
      )}
    </>
  );
}
