import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryInfo } from '../../shared/categories';
import { CategoryMark } from '../../shared/components/CategoryMark';
import { errorMessage } from '../../shared/errors';
import { resolveMapsLink, type ResolvedLink } from '../mapsLink';

/**
 * "Paste a Google Maps link": the API reads the place's name and position, `onResolved` fills the form and says
 * what it filled. Places already nearby are shown, so nobody adds one twice.
 */
export function MapsLinkImport({ onResolved }: { onResolved: (link: ResolvedLink) => Promise<string[]> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<string[] | null>(null);
  const [nearby, setNearby] = useState<ResolvedLink['nearby']>([]);

  const read = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    setFilled(null);
    try {
      const link = await resolveMapsLink(value);
      setNearby(link.nearby);
      setFilled(await onResolved(link));
    } catch (e) {
      setNearby([]);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="maps-link panel">
      {/* Not a <form>: it sits inside the place form. */}
      <div>
        <label htmlFor="maps-link">Link z Google Maps</label>
        <p className="data muted">W Google Maps: Udostępnij → Kopiuj link. Wklej go tutaj, a resztę uzupełnimy.</p>
        <div className="row maps-link-row">
          <input
            id="maps-link"
            type="url"
            inputMode="url"
            placeholder="https://maps.app.goo.gl/…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // never submit the place form from here
                void read(text);
              }
            }}
            onPaste={(e) => {
              // Read right away: pasting is the whole point.
              const pasted = e.clipboardData.getData('text');
              if (pasted) {
                e.preventDefault();
                setText(pasted.trim());
                void read(pasted);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!text.trim() || busy}
            onClick={() => void read(text)}
          >
            {busy ? 'Czytam…' : 'Wczytaj'}
          </button>
        </div>
      </div>
      <div aria-live="polite">
        {error && <p className="notice">{error}</p>}
        {filled && (
          <p className="data">
            {filled.length ? `Uzupełniono: ${filled.join(', ')}. Sprawdź i popraw, jeśli trzeba.` : 'Nic nowego.'}
          </p>
        )}
      </div>
      {nearby.length > 0 && (
        <div className="maps-link-nearby">
          <p className="label">Może to miejsce już jest w aplikacji?</p>
          <ul>
            {nearby.map((p) => (
              <li key={p.id}>
                <Link to={`/places/${p.id}`} target="_blank" rel="noreferrer">
                  <CategoryMark category={p.category_id} size={14} /> {p.name}
                </Link>{' '}
                <span className="data muted">
                  {categoryInfo(p.category_id).label} · {p.distance_m} m
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
