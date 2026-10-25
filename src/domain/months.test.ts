import { describe, expect, it } from 'vitest';
import { monthOptions } from './months';

describe('month picker options', () => {
  it('keeps the current month available after selecting a prior month', () => {
    const options = monthOptions('2026-10', '2026-09');
    expect(options[0]).toBe('2026-10');
    expect(options).toContain('2026-09');
    expect(options).toHaveLength(25);
  });

  it('keeps an already selected older month visible', () => {
    expect(monthOptions('2026-10', '2024-01')).toContain('2024-01');
  });
});
