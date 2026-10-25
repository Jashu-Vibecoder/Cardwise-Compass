import { describe, expect, it } from 'vitest';
import { transactionInSelectedScope } from './transaction-filter';

describe('transaction month scope', () => {
  it('keeps selected-month filtering by default and includes older months when enabled', () => {
    expect(transactionInSelectedScope('2026-09', '2026-10', false)).toBe(false);
    expect(transactionInSelectedScope('2026-10', '2026-10', false)).toBe(true);
    expect(transactionInSelectedScope('2026-09', '2026-10', true)).toBe(true);
  });
});
