import { describe, expect, it } from 'vitest';
import { transactionDedupeKey } from './transaction-dedupe';

describe('transaction dedupe keys', () => {
  const input = { occurred_at: '2026-10-05T12:00:00+05:30', amount_minor: 12500, currency: 'INR', transaction_type: 'expense' as const, merchant: 'Market', description: 'Weekly shop', category_id: 'cat-grocery', card_id: null, recurring: false, spend_channel: 'unknown' as const };
  it('normalizes merchant case but distinguishes different descriptions', () => {
    expect(transactionDedupeKey({ ...input, merchant: 'market' }, 'Asia/Kolkata')).toBe(transactionDedupeKey(input, 'Asia/Kolkata'));
    expect(transactionDedupeKey({ ...input, description: 'Different note' }, 'Asia/Kolkata')).not.toBe(transactionDedupeKey(input, 'Asia/Kolkata'));
  });
});
