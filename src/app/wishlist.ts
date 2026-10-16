// "Chcę odwiedzić" (US-10): each member's list of places they want to visit, seen by everyone. Not a regular place:
// only a name, a point (with its address), a description and a link.
import { useQuery } from '@tanstack/react-query';
import { api, unwrap, type Schemas } from '../shared/api';

export type WishlistItem = Schemas['WishlistItem'];
export type WishlistItemList = Schemas['WishlistItemList'];

/** Query keys start with 'wishlist', so one invalidation refreshes lists, items and the map layer. */
export const WISHLIST = ['wishlist'] as const;

/**
 * The yellow ring with an ink border (44×44 viewBox): the wishlist's mark on the map and in lists, unlike any
 * category's. Constant markup (used with innerHTML).
 */
export const WISH_RING =
  '<circle cx="22" cy="22" r="16" fill="none" stroke="#141414" stroke-width="12"/>' +
  '<circle cx="22" cy="22" r="16" fill="none" stroke="#F2B900" stroke-width="8"/>';

export function useWishlistItem(id: string) {
  return useQuery({
    queryKey: [...WISHLIST, 'item', id],
    queryFn: () => unwrap(api.GET('/wishlist/{id}', { params: { path: { id } } })),
    enabled: !!id,
  });
}

/** A member's whole list (mine when `memberId` is null): not visited first, then visited. */
export function useWishlist(memberId: string | null) {
  return useQuery({
    queryKey: [...WISHLIST, 'list', memberId ?? 'me'],
    queryFn: () =>
      unwrap(
        memberId
          ? api.GET('/members/{id}/wishlist', { params: { path: { id: memberId }, query: { limit: 100 } } })
          : api.GET('/me/wishlist', { params: { query: { limit: 100 } } }),
      ),
  });
}

/** How many on my list I have not visited yet (the tile on my profile). */
export function useWishlistCount() {
  return useQuery({
    queryKey: [...WISHLIST, 'count'],
    queryFn: () => unwrap(api.GET('/me/wishlist', { params: { query: { visited: 'false', limit: 1 } } })),
    select: (r) => r.total,
  });
}
