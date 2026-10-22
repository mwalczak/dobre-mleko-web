import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api, unwrap, uploadImage, type Photo, type PlaceDetail } from '../../shared/api';
import { useToast } from '../../shared/components/Toast';
import { preparePhoto } from '../../shared/image';
import { useMe, useMeta } from '../../shared/session';

/**
 * Photos while editing a place (DM-13). Changes apply right away, not with "Zapisz": a photo is removed with
 * DELETE /photos/:id (its uploader or an admin; a rating keeps at least one), and added to my own rating of the place
 * (POST /photos, then PUT /places/:id/rating with my scores unchanged) — so adding needs my rating. The place's author
 * or an admin reorders the photos (drag, or the arrows) with PUT /places/:id/photos/order; the first one is the cover.
 */
export function PlacePhotosField({ place }: { place: PlaceDetail }) {
  const me = useMe().data;
  const meta = useMeta().data;
  const toast = useToast();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [dragged, setDragged] = useState<number | null>(null);
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['place', place.id] }),
      client.invalidateQueries({ queryKey: ['places'] }),
    ]);

  const mine = place.photos.filter((x) => x.uploaded_by === me?.id).length;
  const max = meta?.max_photos_per_rating ?? 6;
  const scores = place.my_scores;
  const left = scores ? max - mine : 0;

  const canOrder = place.is_mine || !!me?.is_admin;
  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      unwrap(api.PUT('/places/{id}/photos/order', { params: { path: { id: place.id } }, body: { photo_ids: ids } })),
    onSuccess: refresh,
    onError: toast.fail,
  });
  // The new order shows right away, before the place is reloaded.
  const photos = reorder.isPending
    ? reorder.variables.map((id) => place.photos.find((x) => x.id === id)!).filter(Boolean)
    : place.photos;

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= photos.length || reorder.isPending) return;
    const ids = photos.map((x) => x.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    reorder.mutate(ids);
  }

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
          {photos.map((x, i) => (
            <div
              key={x.id}
              className={`photo-picker-item${dragged === i ? ' dragging' : ''}`}
              draggable={canOrder && photos.length > 1}
              onDragStart={() => setDragged(i)}
              onDragEnd={() => setDragged(null)}
              onDragOver={(e) => dragged !== null && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged !== null) move(dragged, i);
                setDragged(null);
              }}
            >
              <img src={x.thumb_url} alt={`Zdjęcie ${i + 1}`} draggable={false} />
              {i === 0 && photos.length > 1 && <span className="photo-cover label">Okładka</span>}
              {canOrder && photos.length > 1 && (
                <span className="photo-move">
                  <button
                    type="button"
                    className="btn btn-small"
                    aria-label={`Przesuń zdjęcie ${i + 1} wcześniej`}
                    disabled={i === 0 || reorder.isPending}
                    onClick={() => move(i, i - 1)}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="btn btn-small"
                    aria-label={`Przesuń zdjęcie ${i + 1} dalej`}
                    disabled={i === photos.length - 1 || reorder.isPending}
                    onClick={() => move(i, i + 1)}
                  >
                    ▶
                  </button>
                </span>
              )}
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
          {canOrder && photos.length > 1 && 'Przeciągnij zdjęcie, żeby zmienić kolejność — pierwsze to okładka. '}
          {scores
            ? `Twoja ocena ma ${mine} z ${max} zdjęć i musi mieć co najmniej jedno.`
            : 'Zdjęcia dodaje się razem z oceną — oceń miejsce, żeby dodać swoje.'}
        </p>
      </div>
    </fieldset>
  );
}
