import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../shared/api';
import { useToast } from '../shared/components/Toast';
import { ago, number } from '../shared/format';

export const JOIN_KEY = ['admin', 'join-requests'];

const STATUS = { pending: 'Czeka', accepted: 'Dodano', dismissed: 'Odrzucono' } as const;

/** Count of pending requests for the tab label. */
export function usePendingJoinRequests(): number {
  const list = useQuery({ queryKey: JOIN_KEY, queryFn: () => unwrap(api.GET('/admin/join-requests')) });
  return list.data?.items.filter((i) => i.status === 'pending').length ?? 0;
}

/**
 * Join requests from shared links (DM-45): accept puts the e-mail on the list, and how sharing works per member —
 * links shared, opened, requests and people who joined.
 */
export function JoinRequests() {
  const client = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: JOIN_KEY, queryFn: () => unwrap(api.GET('/admin/join-requests')) });
  const handle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'dismiss' }) =>
      unwrap(
        action === 'accept'
          ? api.POST('/admin/join-requests/{id}/accept', { params: { path: { id } } })
          : api.POST('/admin/join-requests/{id}/dismiss', { params: { path: { id } } }),
      ),
    onSuccess: (_, { action }) => {
      toast.ok(action === 'accept' ? 'Dodano do listy. Może się już zalogować.' : 'Odrzucono.');
      return Promise.all([
        client.invalidateQueries({ queryKey: JOIN_KEY }),
        client.invalidateQueries({ queryKey: ['admin', 'allowed'] }),
      ]);
    },
    onError: toast.fail,
  });

  if (list.isLoading) return <p className="label">Ładowanie…</p>;
  if (!list.data) return null;
  const { items, sharers } = list.data;
  const pending = items.filter((i) => i.status === 'pending');

  return (
    <section aria-label="Prośby o dołączenie">
      <p className="label">{pending.length} czeka · prośby przychodzą z udostępnionych miejsc (/s/…)</p>
      {items.length === 0 ? (
        <p className="muted">Nikt jeszcze nie poprosił o dołączenie.</p>
      ) : (
        <div className="table-wrap panel">
          <table className="people">
            <thead>
              <tr>
                <th scope="col">Osoba</th>
                <th scope="col">Skąd</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Akcje</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="person-name">{r.name}</div>
                    <div className="person-email data">{r.email}</div>
                  </td>
                  <td>
                    <div className="data">{r.referred_by ? `Poleca ${r.referred_by.display_name}` : '—'}</div>
                    {r.place && (
                      <div className="data">
                        <a href={`/places/${r.place.id}`}>{r.place.name}</a>
                      </div>
                    )}
                    <div className="data muted">{ago(r.created_at)}</div>
                  </td>
                  <td>
                    <div className="data">{STATUS[r.status]}</div>
                    {r.joined && <div className="data">Dołączył(a)</div>}
                  </td>
                  <td>
                    {r.status === 'pending' && (
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn-primary btn-small"
                          disabled={handle.isPending}
                          onClick={() => handle.mutate({ id: r.id, action: 'accept' })}
                        >
                          Dodaj do listy
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          disabled={handle.isPending}
                          onClick={() =>
                            confirm(`Odrzucić prośbę ${r.email}?`) && handle.mutate({ id: r.id, action: 'dismiss' })
                          }
                        >
                          Odrzuć
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="label admin-subhead">Udostępnianie</h2>
      {sharers.length === 0 ? (
        <p className="muted">Nikt jeszcze nie udostępnił miejsca.</p>
      ) : (
        <div className="table-wrap panel">
          <table className="people">
            <thead>
              <tr>
                <th scope="col">Osoba</th>
                <th scope="col">Miejsca</th>
                <th scope="col">Otwarcia</th>
                <th scope="col">Prośby</th>
                <th scope="col">Dołączyło</th>
              </tr>
            </thead>
            <tbody>
              {sharers.map((s) => (
                <tr key={s.member.id}>
                  <td>
                    <div className="person-name">{s.member.display_name}</div>
                  </td>
                  <td className="data">{number(s.shares)}</td>
                  <td className="data">{number(s.opens)}</td>
                  <td className="data">{number(s.requests)}</td>
                  <td className="data">{number(s.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
