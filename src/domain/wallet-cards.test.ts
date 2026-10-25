import { describe, expect, it } from 'vitest';
import { findWalletCardToUpdate } from './wallet-cards';

describe('wallet card instances', () => {
  const cards = [
    { id: 'instance-1', catalog_card_id: 'catalog-1' },
    { id: 'instance-2', catalog_card_id: 'catalog-1' },
  ];

  it('does not treat another copy of the same catalogue card as an edit', () => {
    expect(findWalletCardToUpdate(cards, undefined)).toBeUndefined();
  });

  it('updates only the requested saved card instance', () => {
    expect(findWalletCardToUpdate(cards, 'instance-2')).toBe(cards[1]);
  });
});
