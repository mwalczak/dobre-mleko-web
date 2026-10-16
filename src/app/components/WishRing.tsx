import { WISH_RING } from '../wishlist';

/** The wishlist's mark: a yellow ring with an ink border (named for screen readers when `title`). */
export function WishRing({ size = 20, title }: { size?: number; title?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      role={title ? 'img' : undefined}
      aria-label={title ? 'Chcę odwiedzić' : undefined}
      aria-hidden={title ? undefined : true}
      style={{ flex: 'none' }}
      // Constant markup (wishlist.ts).
      dangerouslySetInnerHTML={{ __html: WISH_RING }}
    />
  );
}
