import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, unwrap } from '../../shared/api';
import { ShapeIcon } from '../../shared/components/CategoryMark';
import { useToast } from '../../shared/components/Toast';
import { date } from '../../shared/format';
import { REPORT_STATUS, REPORT_TYPES, useReports, useSimilarReports, type Report, type ReportType } from '../reports';

/** Report a bug, an idea or abuse (they go to PMO, the issue tracker), and see what is already reported. */
export function ReportPage() {
  const [sent, setSent] = useState<Report | null>(null);
  return (
    <div className="page narrow report">
      <header className="page-head">
        <p className="label">Zgłoszenia</p>
        <h1 className="display">Coś nie gra?</h1>
        <p>
          Zgłoś błąd, podziel się pomysłem albo daj znać o nadużyciu. Najpierw zerknij, czy ktoś już tego nie zgłosił.
        </p>
      </header>
      {sent ? <Sent report={sent} onAnother={() => setSent(null)} /> : <ReportForm onSent={setSent} />}
      <ReportList />
    </div>
  );
}

function ReportForm({ onSent }: { onSent: (r: Report) => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState<ReportType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(title.trim()), 350);
    return () => clearTimeout(t);
  }, [title]);
  // Abuse reports are private, so there is nothing to compare them with.
  const similar = useSimilarReports(type === 'abuse' ? '' : q);
  const matches = q.length >= 3 && type !== 'abuse' ? (similar.data?.items ?? []) : [];

  const send = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/reports', {
          body: { type, title: title.trim(), description: description.trim() || undefined },
        }),
      ),
    onSuccess: (report) => {
      toast.ok(`Wysłano zgłoszenie ${report.key}.`);
      onSent(report);
      return client.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: toast.fail,
  });

  return (
    <form
      className="report-form"
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate();
      }}
    >
      <fieldset className="field">
        <legend className="label">Co zgłaszasz</legend>
        <div className="chips">
          {(Object.keys(REPORT_TYPES) as ReportType[]).map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => setType(t)}>
              <TypeMark type={t} /> {REPORT_TYPES[t].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="report-title">W skrócie</label>
        <input
          id="report-title"
          required
          minLength={3}
          maxLength={200}
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {matches.length > 0 && (
        <section className="report-similar" aria-live="polite">
          <h2 className="label">Może to już jest zgłoszone?</h2>
          <ul className="report-list">
            {matches.map((r) => (
              <ReportRow key={r.key} report={r} compact />
            ))}
          </ul>
        </section>
      )}

      <div className="field">
        <label htmlFor="report-description">Szczegóły</label>
        <textarea
          id="report-description"
          rows={5}
          maxLength={5000}
          placeholder={REPORT_TYPES[type].placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {type === 'abuse' && (
        <p className="notice">Zgłoszenie nadużycia jest prywatne: zobaczą je tylko administratorzy.</p>
      )}
      <p className="data muted">
        Zgłoszenie trafi do naszego trackera (PMO) z Twoim imieniem i e-mailem. Za pierwszym razem dostaniesz e-mailem
        klucz do śledzenia swoich zgłoszeń, a potem wiadomość, gdy zmieni się ich status.
      </p>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={title.trim().length < 3 || send.isPending}>
          Wyślij zgłoszenie
        </button>
      </div>
    </form>
  );
}

function Sent({ report, onAnother }: { report: Report; onAnother: () => void }) {
  return (
    <section className="panel report-sent" aria-live="polite">
      <p className="label">
        {report.key} · {REPORT_TYPES[report.type].label}
      </p>
      <h2 className="title">Dzięki, mamy to.</h2>
      <p>
        {report.private
          ? 'Zgłoszenie jest prywatne — zobaczą je tylko administratorzy. '
          : 'Zgłoszenie jest już na liście poniżej. '}
        Damy znać e-mailem, gdy zmieni się jego status.
      </p>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onAnother}>
          Zgłoś coś jeszcze
        </button>
        <Link to="/" className="btn btn-secondary">
          Wróć do odkrywania
        </Link>
      </div>
    </section>
  );
}

function ReportList() {
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const list = useReports(status);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unavailable = list.error instanceof ApiError && list.error.code === 'reports_unavailable';

  return (
    <section className="report-all" aria-labelledby="report-all-title">
      <h2 id="report-all-title" className="title">
        Już zgłoszone
      </h2>
      <div className="chips">
        {(
          [
            ['open', 'Otwarte'],
            ['closed', 'Zamknięte'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" className="chip" aria-pressed={status === key} onClick={() => setStatus(key)}>
            {label}
          </button>
        ))}
      </div>
      {list.isLoading && <p className="label">Ładowanie…</p>}
      {list.isError && (
        <p className="notice">
          {unavailable ? 'Zgłoszenia są chwilowo niedostępne. Spróbuj za chwilę.' : 'Nie udało się wczytać zgłoszeń.'}
        </p>
      )}
      {list.isSuccess && items.length === 0 && (
        <p className="empty muted">
          {status === 'open' ? 'Nic otwartego. Wszystko gra?' : 'Jeszcze nic nie zamknięto.'}
        </p>
      )}
      <ul className="report-list">
        {items.map((r) => (
          <ReportRow key={r.key} report={r} />
        ))}
      </ul>
      {list.hasNextPage && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
        >
          Pokaż więcej
        </button>
      )}
    </section>
  );
}

function ReportRow({ report: r, compact = false }: { report: Report; compact?: boolean }) {
  return (
    <li className="report-row">
      <TypeMark type={r.type} size={18} />
      <div className="report-body">
        <p className="label">
          {r.key} · {REPORT_TYPES[r.type].label} · {date(r.created_at)}
        </p>
        <h3 className="report-title">{r.title}</h3>
        {!compact && r.description && <p className="report-description">{r.description}</p>}
      </div>
      <span className="badge report-status" data-status={r.status}>
        {REPORT_STATUS[r.status]}
        {r.duplicate_of && ` ${r.duplicate_of}`}
      </span>
    </li>
  );
}

function TypeMark({ type, size = 14 }: { type: ReportType; size?: number }) {
  const t = REPORT_TYPES[type];
  return <ShapeIcon shape={t.shape} color={t.color} size={size} />;
}
