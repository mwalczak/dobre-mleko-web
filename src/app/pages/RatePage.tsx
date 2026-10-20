import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, unwrap, type PlaceDetail } from '../../shared/api';
import { categoryInfo } from '../../shared/categories';
import { PhotoImage } from '../../shared/components/PhotoImage';
import { useToast } from '../../shared/components/Toast';
import { useMe, useMeta } from '../../shared/session';
import { PhotoPicker, type Uploaded } from '../components/PhotoPicker';
import { EMPTY_SCORES, RatingInput, scoresComplete, type ScoresDraft } from '../components/RatingInput';
import { VisitDateField } from '../components/VisitDateField';
import { usePlace } from './PlacePage';

export function RatePage() {
  const { id = '' } = useParams();
  const place = usePlace(id);
  if (place.isLoading) return <p className="page label">Ładowanie…</p>;
  if (!place.data) return <p className="page notice">Nie ma takiego miejsca.</p>;
  return <Rate p={place.data} />;
}

function Rate({ p }: { p: PlaceDetail }) {
  const me = useMe().data;
  const meta = useMeta().data;
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [scores, setScores] = useState<ScoresDraft>(p.my_scores ?? EMPTY_SCORES);
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [visitedOn, setVisitedOn] = useState(p.my_visited_on ?? '');
  const [why, setWhy] = useState('');
  const myPhotos = p.photos.filter((ph) => ph.uploaded_by === me?.id);
  const max = (meta?.max_photos_per_rating ?? 6) - myPhotos.length;
  const hasPhoto = myPhotos.length + photos.length > 0;
  const path = { params: { path: { id: p.id } } };

  const done = async (message: string) => {
    toast.ok(message);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['place', p.id] }),
      client.invalidateQueries({ queryKey: ['places'] }),
    ]);
    navigate(`/places/${p.id}`);
  };
  const save = useMutation({
    mutationFn: async () => {
      const saved = await unwrap(
        api.PUT('/places/{id}/rating', {
          ...path,
          body: {
            vibe: scores.vibe!,
            offer: scores.offer!,
            service: scores.service,
            value: scores.value,
            visited_on: visitedOn || null,
            photo_ids: photos.map((x) => x.id),
          },
        }),
      );
      // DM-8: "Dlaczego warto" from someone who did not add the place goes to the comments, next to their rating.
      if (why.trim()) await unwrap(api.POST('/places/{id}/comments', { ...path, body: { body: why.trim() } }));
      return saved;
    },
    onSuccess: () => done('Zapisano ocenę.'),
    onError: toast.fail,
  });
  const remove = useMutation({
    mutationFn: () => unwrap(api.DELETE('/places/{id}/rating', path)),
    onSuccess: () => done('Usunięto ocenę i jej zdjęcia.'),
    onError: toast.fail,
  });
  const removePhoto = useMutation({
    mutationFn: (photoId: string) => unwrap(api.DELETE('/photos/{id}', { params: { path: { id: photoId } } })),
    onSuccess: () => client.invalidateQueries({ queryKey: ['place', p.id] }),
    onError: toast.fail,
  });

  return (
    <form
      className="page narrow rate"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <header className="page-head">
        <p className="label">Twoja ocena · {categoryInfo(p.category_id).label}</p>
        <h1 className="display">{p.name}</h1>
      </header>

      <RatingInput value={scores} onChange={setScores} />
      <VisitDateField value={visitedOn} onChange={setVisitedOn} />
      <div className="field">
        <label htmlFor="rate-why">Dlaczego warto?</label>
        <textarea id="rate-why" rows={3} maxLength={1000} value={why} onChange={(e) => setWhy(e.target.value)} />
        <span className="data muted">Nieobowiązkowe. Pojawi się w komentarzach razem z Twoją oceną.</span>
      </div>

      <section className="place-section">
        <h2 className="label">Zdjęcia</h2>
        {myPhotos.length > 0 && (
          <div className="photo-picker-grid">
            {myPhotos.map((ph) => (
              <div key={ph.id} className="photo-picker-item">
                <PhotoImage photo={ph} thumb alt="" />
                <button
                  type="button"
                  className="btn btn-small photo-remove"
                  aria-label="Usuń zdjęcie"
                  disabled={myPhotos.length + photos.length <= 1 && !!p.my_scores}
                  title={myPhotos.length + photos.length <= 1 ? 'Ocena musi mieć co najmniej jedno zdjęcie' : undefined}
                  onClick={() => removePhoto.mutate(ph.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <PhotoPicker value={photos} onChange={setPhotos} max={Math.max(0, max)} required />
      </section>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!scoresComplete(scores) || !hasPhoto || save.isPending}
        >
          Zapisz ocenę
        </button>
        <Link to={`/places/${p.id}`} className="btn btn-secondary">
          Anuluj
        </Link>
        {p.my_scores && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => confirm('Usunąć Twoją ocenę razem z jej zdjęciami?') && remove.mutate()}
          >
            Usuń ocenę
          </button>
        )}
      </div>
      {!hasPhoto && <p className="data muted">Dodaj co najmniej jedno zdjęcie.</p>}
    </form>
  );
}
