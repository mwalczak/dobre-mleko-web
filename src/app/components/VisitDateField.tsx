import { useId, useState } from 'react';
import { DateCalendar, longDay, useVisitRange } from './DateCalendar';

/**
 * "Kiedy byłeś?": an optional visit date ('YYYY-MM-DD' or ''), from a year ago to today. Only the author sees it.
 * Our own calendar instead of the browser's date picker (DM-26, DM-27).
 */
export function VisitDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const range = useVisitRange();
  const [open, setOpen] = useState(false);
  return (
    <div className="field visit-date">
      <span className="field-label" id={id}>
        Kiedy byłeś?
      </span>
      <div className="row">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          aria-describedby={id}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {value ? longDay(value) : 'Wybierz datę'}
        </button>
        {value && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Wyczyść
          </button>
        )}
      </div>
      {open && (
        <DateCalendar
          value={value}
          label="Kiedy byłeś?"
          {...range}
          onChange={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      )}
      <span className="data muted">Nieobowiązkowe, najwyżej rok wstecz. Widzisz ją tylko Ty.</span>
    </div>
  );
}
