import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, postForm } from '../../shared/api';
import { ShapeIcon } from '../../shared/components/CategoryMark';
import { useToast } from '../../shared/components/Toast';
import { date } from '../../shared/format';
import {
  CLIENT_PLATFORM,
  isPrivateType,
  labelOf,
  MAX_FILE_BYTES,
  MAX_FILES,
  REPORT_STATUS,
  typeLook,
  useReportOptions,
  useReports,
  useSimilarReports,
  type CreatedReport,
  type Report,
  type ReportChoice,
} from '../reports';

/**
 * Report a bug, an idea or abuse (they go to PMO, the issue tracker), and see what is already reported. The types and
 * platforms offered come from PMO.
 */
export function ReportPage() {
  const options = useReportOptions();
  const [sent, setSent] = useState<CreatedReport | null>(null);
  const unavailable = options.isError;
  return (
    <div className="page narrow report">
      <header className="page-head">
        <p className="label">Zgłoszenia</p>
        <h1 className="display">Coś nie gra?</h1>
        <p>
          Zgłoś błąd, podziel się pomysłem albo daj znać o nadużyciu. Najpierw zerknij, czy ktoś już tego nie zgłosił.
        </p>
      </header>
      {unavailable && <p className="notice">Zgłoszenia są chwilowo niedostępne. Spróbuj za chwilę.</p>}
      {options.isLoading && <p className="label">Ładowanie…</p>}
      {options.data &&
        (sent ? (
          <Sent report={sent} types={options.data.issue_types} onAnother={() => setSent(null)} />
        ) : (
          <ReportForm types={options.data.issue_types} platforms={options.data.platforms} onSent={setSent} />
        ))}
      <ReportList types={options.data?.issue_types} />
    </div>
  );
}

function ReportForm({
  types,
  platforms,
  onSent,
}: {
  types: ReportChoice[];
  platforms: ReportChoice[];
  onSent: (r: CreatedReport) => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState(types[0]?.id ?? '');
  // The native apps open this page with ?platform=android (or ios); otherwise this web app's own platform.
  const [params] = useSearchParams();
  const [platform, setPlatform] = useState(
    () =>
      [params.get('platform'), CLIENT_PLATFORM].find((id) => platforms.some((p) => p.id === id)) ??
      platforms[0]?.id ??
      '',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(title.trim()), 350);
    return () => clearTimeout(t);
  }, [title]);
  const similar = useSimilarReports(isPrivateType(type) ? '' : q);
  const matches = q.length >= 3 && !isPrivateType(type) ? (similar.data?.items ?? []) : [];

  const send = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('type', type);
      form.append('title', title.trim());
      if (description.trim()) form.append('description', description.trim());
      if (platform) form.append('platform', platform);
      for (const f of files) form.append('file', f, f.name);
      return postForm<CreatedReport>('/reports', form);
    },
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
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              aria-pressed={type === t.id}
              onClick={() => setType(t.id)}
            >
              <TypeMark type={t.id} /> {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      {platforms.length > 1 && (
        <fieldset className="field">
          <legend className="label">Gdzie</legend>
          <div className="chips">
            {platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={platform === p.id}
                onClick={() => setPlatform(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

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
              <ReportRow key={r.key} report={r} types={types} compact />
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
          placeholder={typeLook(type).placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <AttachmentPicker files={files} onChange={setFiles} />

      {isPrivateType(type) && (
        <p className="notice">Zgłoszenie nadużycia jest prywatne: zobaczą je tylko administratorzy.</p>
      )}
      <p className="data muted">
        Zgłoszenie trafi do naszego trackera (PMO) z Twoim imieniem i e-mailem. Za pierwszym razem dostaniesz e-mailem
        klucz do śledzenia swoich zgłoszeń, a potem wiadomość, gdy zmieni się ich status.
      </p>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!type || title.trim().length < 3 || send.isPending}>
          {send.isPending && files.length ? 'Wysyłanie plików…' : 'Wyślij zgłoszenie'}
        </button>
      </div>
    </form>
  );
}

/** Screenshots and recordings: up to MAX_FILES images or videos of up to 50 MB each, checked before sending. */
function AttachmentPicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const toast = useToast();
  const previews = useMemo(
    () => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
    [files],
  );
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const add = (picked: FileList | null) => {
    const ok: File[] = [];
    for (const f of Array.from(picked ?? [])) {
      if (!/^(image|video)\//.test(f.type)) toast.fail(new Error(`${f.name}: dodaj zdjęcie albo nagranie.`));
      else if (f.size > MAX_FILE_BYTES) toast.fail(new Error(`${f.name}: plik może mieć najwyżej 50 MB.`));
      else ok.push(f);
    }
    const next = [...files, ...ok];
    if (next.length > MAX_FILES) toast.fail(new Error(`Najwyżej ${MAX_FILES} pliki.`));
    onChange(next.slice(0, MAX_FILES));
  };

  return (
    <fieldset className="field">
      <legend className="label">Zrzuty ekranu i nagrania (opcjonalnie)</legend>
      {files.length > 0 && (
        <ul className="report-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="report-file">
              {previews[i] ? <img src={previews[i]!} alt="" /> : <span className="report-file-video">▶</span>}
              <span className="data">
                {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                className="btn btn-small"
                aria-label={`Usuń ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < MAX_FILES && (
        <label className="btn btn-secondary report-add-file">
          Dodaj plik
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="visually-hidden"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </fieldset>
  );
}

function Sent({ report, types, onAnother }: { report: CreatedReport; types: ReportChoice[]; onAnother: () => void }) {
  return (
    <section className="panel report-sent" aria-live="polite">
      <p className="label">
        {report.key} · {labelOf(types, report.type)}
      </p>
      <h2 className="title">Dzięki, mamy to.</h2>
      <p>
        {report.private
          ? 'Zgłoszenie jest prywatne — zobaczą je tylko administratorzy. '
          : 'Zgłoszenie jest już na liście poniżej. '}
        Damy znać e-mailem, gdy zmieni się jego status.
      </p>
      {report.failed_files.length > 0 && (
        <p className="notice">Nie udało się dołączyć: {report.failed_files.join(', ')}.</p>
      )}
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

function ReportList({ types }: { types: ReportChoice[] | undefined }) {
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
          <ReportRow key={r.key} report={r} types={types} />
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

function ReportRow({
  report: r,
  types,
  compact = false,
}: {
  report: Report;
  types: ReportChoice[] | undefined;
  compact?: boolean;
}) {
  return (
    <li className="report-row">
      <TypeMark type={r.type} size={18} />
      <div className="report-body">
        <p className="label">
          {r.key} · {labelOf(types, r.type)} · {date(r.created_at)}
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

function TypeMark({ type, size = 14 }: { type: string; size?: number }) {
  const look = typeLook(type);
  return <ShapeIcon shape={look.shape} color={look.color} size={size} />;
}
