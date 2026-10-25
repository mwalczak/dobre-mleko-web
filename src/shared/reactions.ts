import type { Schemas } from './api';

export type ReactionId = NonNullable<Schemas['Comment']['my_reaction']>;

/** Face outline and round eyes shared by several glyphs. */
const FACE = 'M12 2A10 10 0 1 1 12 22A10 10 0 1 1 12 2Z';
const EYES =
  'M8.5 7.6A1.6 1.6 0 1 1 8.5 10.8A1.6 1.6 0 1 1 8.5 7.6Z M15.5 7.6A1.6 1.6 0 1 1 15.5 10.8A1.6 1.6 0 1 1 15.5 7.6Z';
const GRIN = 'M6.5 12.8H17.5A5.5 5.5 0 0 1 6.5 12.8Z';

/**
 * Reactions to comments (DM-40), in display order: Bauhaus glyphs on a 24 × 24 grid, one colour each, eyes and mouths
 * cut out (fill-rule evenodd). The same paths and colours in the apps (`ReactionGlyph`).
 */
export const REACTIONS: { id: ReactionId; label: string; color: string; path: string }[] = [
  {
    id: 'love',
    label: 'Uwielbiam',
    color: 'var(--red)',
    path: 'M12 21.2L3.4 12.6A5.1 5.1 0 0 1 12 5.4A5.1 5.1 0 0 1 20.6 12.6Z',
  },
  {
    id: 'like',
    label: 'Super',
    color: 'var(--blue)',
    path: 'M3 3H21V21H3Z M6.3 12.2L8.3 10.2L10.8 12.7L15.7 7.8L17.7 9.8L10.8 16.7Z',
  },
  {
    id: 'haha',
    label: 'Haha',
    color: 'var(--yellow)',
    path: `${FACE} M6.8 8.4H10.2V10.2H6.8Z M13.8 8.4H17.2V10.2H13.8Z ${GRIN}`,
  },
  {
    id: 'wow',
    label: 'Wow',
    color: 'var(--yellow)',
    path: `${FACE} ${EYES} M12 12.6A2.8 2.8 0 1 1 12 18.2A2.8 2.8 0 1 1 12 12.6Z`,
  },
  {
    id: 'yum',
    label: 'Pycha',
    color: 'var(--yellow)',
    path: `${FACE} M6.8 10.6L8.5 7.6L10.2 10.6Z M13.8 10.6L15.5 7.6L17.2 10.6Z ${GRIN} M13.6 14.6A1.7 1.7 0 1 1 13.6 18A1.7 1.7 0 1 1 13.6 14.6Z`,
  },
  {
    id: 'fire',
    label: 'Petarda',
    color: 'var(--red)',
    path: 'M13 1.5L18.8 12.6A6.8 6.8 0 1 1 5.5 11.4L8.7 6.6L10.3 10.2Z M12.2 12.2L14.6 16.3A2.5 2.5 0 1 1 9.8 16.3Z',
  },
  {
    id: 'sad',
    label: 'Smutno',
    color: 'var(--blue)',
    path: `${FACE} ${EYES} M7.4 17.6A4.6 4.6 0 0 1 16.6 17.6H14.4A2.4 2.4 0 0 0 9.6 17.6Z`,
  },
  {
    id: 'cancel',
    label: 'Cancel',
    color: 'var(--red)',
    path: 'M5.6 3L12 9.4L18.4 3L21 5.6L14.6 12L21 18.4L18.4 21L12 14.6L5.6 21L3 18.4L9.4 12L3 5.6Z',
  },
];

export const reaction = (id: ReactionId) => REACTIONS.find((r) => r.id === id)!;
