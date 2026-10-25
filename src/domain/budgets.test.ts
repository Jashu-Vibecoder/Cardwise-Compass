import { describe, expect, it } from 'vitest';
import { hasBudgetConflict } from './budgets';

describe('budget creation conflicts', () => {
  const existing = [{ id: 'budget-1', period_start: '2026-10-01', category_id: 'cat-dining' }];
  it('detects a duplicate month and category during creation', () => {
    expect(hasBudgetConflict(existing, { period_start: '2026-10-01', category_id: 'cat-dining' })).toBe(true);
  });
  it('allows a different category or period', () => {
    expect(hasBudgetConflict(existing, { period_start: '2026-10-01', category_id: 'cat-grocery' })).toBe(false);
    expect(hasBudgetConflict(existing, { period_start: '2026-11-01', category_id: 'cat-dining' })).toBe(false);
  });
});
