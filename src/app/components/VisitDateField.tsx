import { useId } from 'react';
import { today } from '../../shared/format';

/** "Kiedy byłeś?": an optional visit date ('YYYY-MM-DD' or ''), never in the future. Only the author sees it. */
export function VisitDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="field visit-date">
      <label htmlFor={id}>Kiedy byłeś?</label>
      <div className="row">
        <input id={id} type="date" max={today()} value={value} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" className="link-button" onClick={() => onChange('')}>
            Wyczyść
          </button>
        )}
      </div>
      <span className="data muted">Nieobowiązkowe. Widzisz ją tylko Ty.</span>
    </div>
  );
}
