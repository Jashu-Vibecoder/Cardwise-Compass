import { describe, expect, it } from 'vitest';
import { currencySymbol, formatCurrency } from './format';

describe('profile currency formatting', () => {
  it('formats amounts and input symbols using the selected currency', () => {
    expect(formatCurrency(12_345, 'USD')).toContain('$');
    expect(currencySymbol('USD')).toBe('$');
    expect(formatCurrency(12_345, 'INR')).toContain('₹');
  });
});
