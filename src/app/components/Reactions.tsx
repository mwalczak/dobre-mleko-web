import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap, type Comment } from '../../shared/api';
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

/**
 * Reactions under a comment (DM-40): what people gave, with counts (tap one to give or take back the same), and
 * „Reaguj” — a row of the 7 glyphs and „Usuń reakcję”. One reaction per person.
 */
export function CommentReactions({ c, refresh }: { c: Comment; refresh: () => Promise<unknown> }) {
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const path = { params: { path: { id: c.id } } };
  const set = useMutation({
    mutationFn: (id: ReactionId | null) =>
      unwrap(
        id
          ? api.PUT('/comments/{id}/reaction', { ...path, body: { reaction: id } })
          : api.DELETE('/comments/{id}/reaction', path),
      ),
    onSuccess: () => {
      setPicking(false);
      return refresh();
    },
    onError: toast.fail,
  });
  const toggle = (id: ReactionId) => set.mutate(c.my_reaction === id ? null : id);

  return (
    <div className="reactions">
      {c.reactions.map((r) => (
        <button
          key={r.reaction}
          type="button"
          className="reaction-chip"
          aria-pressed={c.my_reaction === r.reaction}
          aria-label={`${reaction(r.reaction).label}: ${r.count}`}
          title={`${reaction(r.reaction).label}: ${r.names.join(', ')}`}
          disabled={set.isPending}
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
        disabled={set.isPending}
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
              aria-pressed={c.my_reaction === r.id}
              onClick={() => set.mutate(r.id)}
            >
              <ReactionGlyph id={r.id} size={24} />
            </button>
          ))}
          {c.my_reaction && (
            <button
              type="button"
              className="reaction-cancel"
              aria-label="Usuń reakcję"
              title="Usuń reakcję"
              onClick={() => set.mutate(null)}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
