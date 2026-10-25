import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap, type Comment, type PlaceDetail } from '../../shared/api';
import { useToast } from '../../shared/components/Toast';
import { reaction, REACTIONS, type ReactionId } from '../../shared/reactions';

export function ReactionGlyph({ id, size = 20 }: { id: ReactionId; size?: number }) {
  const r = reaction(id);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill={r.color} fillRule="evenodd" d={r.path} />
    </svg>
  );
}

type Given = { reaction: ReactionId; count: number; names: string[] };

/**
 * Reactions (DM-40): what people gave, with counts (tap one to give or take back the same), and „Reaguj” — a row
 * of the 8 glyphs and „Usuń” (takes mine back). One reaction per person. `set` saves mine (null takes it back).
 */
function Reactions({
  reactions,
  mine,
  set,
}: {
  reactions: Given[];
  mine: ReactionId | null;
  set: (id: ReactionId | null) => Promise<unknown>;
}) {
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const save = useMutation({
    mutationFn: set,
    onSuccess: () => setPicking(false),
    onError: toast.fail,
  });
  const toggle = (id: ReactionId) => save.mutate(mine === id ? null : id);

  return (
    <div className="reactions">
      {reactions.map((r) => (
        <button
          key={r.reaction}
          type="button"
          className="reaction-chip"
          aria-pressed={mine === r.reaction}
          aria-label={`${reaction(r.reaction).label}: ${r.count}`}
          title={`${reaction(r.reaction).label}: ${r.names.join(', ')}`}
          disabled={save.isPending}
          onClick={() => toggle(r.reaction)}
        >
          <ReactionGlyph id={r.reaction} size={16} />
          <span className="data">{r.count}</span>
        </button>
      ))}
      <button
        type="button"
        className="reaction-add"
        aria-expanded={picking}
        onClick={() => setPicking(!picking)}
        disabled={save.isPending}
      >
        Reaguj
      </button>
      {picking && (
        <div className="reaction-picker" role="group" aria-label="Wybierz reakcję">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-label={r.label}
              title={r.label}
              aria-pressed={mine === r.id}
              onClick={() => save.mutate(r.id)}
            >
              <ReactionGlyph id={r.id} size={24} />
            </button>
          ))}
          {mine && (
            <button
              type="button"
              className="reaction-remove"
              aria-label="Usuń reakcję"
              title="Usuń reakcję"
              onClick={() => save.mutate(null)}
            >
              Usuń
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Reactions under a comment. */
export function CommentReactions({ c, refresh }: { c: Comment; refresh: () => Promise<unknown> }) {
  const path = { params: { path: { id: c.id } } };
  const set = async (id: ReactionId | null) => {
    await unwrap(
      id
        ? api.PUT('/comments/{id}/reaction', { ...path, body: { reaction: id } })
        : api.DELETE('/comments/{id}/reaction', path),
    );
    await refresh();
  };
  return <Reactions reactions={c.reactions} mine={c.my_reaction} set={set} />;
}

/** Reactions to a place's recommendation („Dlaczego warto”, by the person who added it). */
export function PlaceReactions({ p, refresh }: { p: PlaceDetail; refresh: () => Promise<unknown> }) {
  const path = { params: { path: { id: p.id } } };
  const set = async (id: ReactionId | null) => {
    await unwrap(
      id
        ? api.PUT('/places/{id}/reaction', { ...path, body: { reaction: id } })
        : api.DELETE('/places/{id}/reaction', path),
    );
    await refresh();
  };
  return <Reactions reactions={p.reactions} mine={p.my_reaction} set={set} />;
}
