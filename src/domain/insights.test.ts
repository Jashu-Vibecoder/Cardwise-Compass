import { describe, expect, it } from 'vitest';
import { findCategoryAskedAbout } from './insights';

describe('category questions', () => {
  const categories = [
    { id: 'dining', slug: 'dining', name: 'Food & dining' },
    { id: 'groceries', slug: 'groceries', name: 'Groceries' },
  ];
  it('recognizes category names in an “on <category>” question', () => {
    expect(findCategoryAskedAbout('How much did I spend on dining?', categories)?.id).toBe('dining');
  });
  it('returns no category for general spending questions', () => {
    expect(findCategoryAskedAbout('How much did I spend this month?', categories)).toBeUndefined();
  });
});
