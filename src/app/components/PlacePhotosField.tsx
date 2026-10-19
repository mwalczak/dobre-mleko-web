import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api, unwrap, uploadImage, type Photo, type PlaceDetail } from '../../shared/api';
import { useToast } from '../../shared/components/Toast';
import { preparePhoto } from '../../shared/image';
import { useMe, useMeta } from '../../shared/session';

/**
 * Photos while editing a place (DM-13). Changes apply right away, not with "Zapisz": a photo is removed with
 * DELETE /photos/:id (its uploader or an admin; a rating keeps at least one), and added to my own rating of the place
 * (POST /photos, then PUT /places/:id/rating with my scores unchanged) — so adding needs my rating.
 */
export function PlacePhotosField({ place }: { place: PlaceDetail }) {
  const me = useMe().data;
  const meta = useMeta().data;
  const toast = useToast();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['place', place.id] }),
      client.invalidateQueries({ queryKey: ['places'] }),
    ]);

  const mine = place.photos.filter((x) => x.uploaded_by === me?.id).length;
  const max = meta?.max_photos_per_rating ?? 6;
  const scores = place.my_scores;
  const left = scores ? max - mine : 0;

  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/photos/{id}', { params: { path: { id } } })),
    onSuccess: refresh,
    onError: toast.fail,
  });

  async function add(files: FileList | null) {
    if (!files?.length || !scores) return;
    const picked = [...files].slice(0, Math.max(0, left));
    setBusy(picked.length);
    try {
      const ids: string[] = [];
      for (const file of picked) {
        const { blob, blurhash } = await preparePhoto(file);
        ids.push((await uploadImage<Photo>('/photos', blob, blurhash)).id);
      }
      await unwrap(
        api.PUT('/places/{id}/rating', {
          params: { path: { id: place.id } },
          body: {
            vibe: scores.vibe,
            offer: scores.offer,
            service: scores.service,
            value: scores.value,
            photo_ids: ids,
          },
        }),
      );
      await refresh();
      toast.ok(ids.length === 1 ? 'Dodano zdjęcie.' : 'Dodano zdjęcia.');
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(0);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <fieldset className="field">
      <legend className="label">Zdjęcia</legend>
      <div className="photo-picker">
        <div className="photo-picker-grid">
          {place.photos.map((x, i) => (
            <div key={x.id} className="photo-picker-item">
              <img src={x.thumb_url} alt={`Zdjęcie ${i + 1}`} />
              {(x.uploaded_by === me?.id || me?.is_admin) && (
                <button
                  type="button"
                  className="btn btn-small photo-remove"
                  aria-label={`Usuń zdjęcie ${i + 1}`}
                  disabled={remove.isPending}
                  onClick={() => confirm('Usunąć to zdjęcie?') && remove.mutate(x.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <div key={`busy-${i}`} className="photo-picker-item busy">
              <span className="label">Wysyłanie…</span>
            </div>
          ))}
          {left > 0 && !busy && (
            <button type="button" className="photo-picker-add" onClick={() => input.current?.click()}>
              <span aria-hidden="true">+</span>
              <span className="label">Dodaj zdjęcie</span>
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          hidden
          onChange={(e) => add(e.target.files)}
        />
        <p className="data muted">
          Zmiany zdjęć zapisują się od razu.{' '}
          {scores
            ? `Twoja ocena ma ${mine} z ${max} zdjęć i musi mieć co najmniej jedno.`
            : 'Zdjęcia dodaje się razem z oceną — oceń miejsce, żeby dodać swoje.'}
        </p>
      </div>
    </fieldset>
  );
}
