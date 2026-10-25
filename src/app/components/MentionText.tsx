import { useQuery } from '@tanstack/react-query';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../shared/api';
import { useMe } from '../../shared/session';

export type Mention = { id: string; display_name: string };

const fold = (s: string) => s.toLocaleLowerCase('pl').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mentions whose `@Imię` is still in the text: what goes to the API as `mention_ids`. */
export const mentionIds = (text: string, mentions: Mention[]) => [
  ...new Set(mentions.filter((m) => text.includes(`@${m.display_name}`)).map((m) => m.id)),
];

/** A comment's text with its mentions (`@Imię`) as links to the members' profiles. */
export function MentionText({ text, mentions }: { text: string; mentions: Mention[] }) {
  if (!mentions.length) return <>{text}</>;
  const names = [...mentions].sort((a, b) => b.display_name.length - a.display_name.length);
  const pattern = new RegExp(`@(${names.map((m) => escape(m.display_name)).join('|')})`, 'g');
  const parts: (string | Mention)[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(last, match.index));
    parts.push(names.find((m) => m.display_name === match[1])!);
    last = match.index! + match[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <Link key={i} to={`/members/${p.id}`} className="mention">
            @{p.display_name}
          </Link>
        ),
      )}
    </>
  );
}

/**
 * A comment textarea that suggests members after „@” (DM-40): picking one puts „@Imię ” in the text and remembers
 * who it is, so the comment can notify them.
 */
export function MentionTextarea({
  id,
  value,
  onChange,
  mentions,
  onMentionsChange,
  label,
  rows = 3,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  mentions: Mention[];
  onMentionsChange: (mentions: Mention[]) => void;
  label?: string;
  rows?: number;
}) {
  const me = useMe().data;
  const listId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const members = useQuery({
    queryKey: ['members'],
    queryFn: () => unwrap(api.GET('/members')),
    enabled: query !== null,
    staleTime: 5 * 60_000,
  });
  const matches =
    query === null
      ? []
      : (members.data?.items ?? [])
          .map((m) => m.profile)
          .filter((p) => p.id !== me?.id && p.status === 'active' && fold(p.display_name).includes(fold(query)))
          .slice(0, 6);

  function track(text: string, caret: number) {
    const before = text.slice(0, caret);
    const at = before.match(/(?:^|\s)@([\p{L}\p{N}_-]{0,20})$/u);
    setQuery(at ? at[1]! : null);
    setActive(0);
  }

  function pick(member: Mention) {
    const el = area.current!;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@[\p{L}\p{N}_-]*$/u, `@${member.display_name} `);
    const next = before + value.slice(caret);
    onChange(next);
    onMentionsChange([...mentions.filter((m) => m.id !== member.id), member]);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!matches.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const m = matches[active]!;
      pick({ id: m.id, display_name: m.display_name });
    } else if (e.key === 'Escape') {
      setQuery(null);
    }
  }

  return (
    <div className="mention-field">
      <textarea
        ref={area}
        id={id}
        rows={rows}
        maxLength={1000}
        value={value}
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={matches.length ? listId : undefined}
        aria-activedescendant={matches.length ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {matches.length > 0 && (
        <ul className="mention-list" role="listbox" id={listId} aria-label="Wspomnij">
          {matches.map((m, i) => (
            <li
              key={m.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick({ id: m.id, display_name: m.display_name });
              }}
            >
              @{m.display_name}
              {m.badge && <span className="badge">{m.badge}</span>}
            </li>
          ))}
        </ul>
      )}
      <span className="data muted">Wpisz @, żeby wspomnieć kogoś — dostanie powiadomienie.</span>
    </div>
  );
}
