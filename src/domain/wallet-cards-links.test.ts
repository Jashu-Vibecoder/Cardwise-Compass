import { describe, expect, it } from 'vitest';
import { clearRemovedCardLinks } from './wallet-cards-links';

describe('removing a saved card', () => {
  it('clears only transactions linked to that wallet-card instance', () => {
    const rows = [{ id: 't1', card_id: 'card-1' }, { id: 't2', card_id: 'card-2' }, { id: 't3', card_id: null }];
    expect(clearRemovedCardLinks(rows, 'card-1')).toEqual([
      { id: 't1', card_id: null }, { id: 't2', card_id: 'card-2' }, { id: 't3', card_id: null },
    ]);
  });
});
