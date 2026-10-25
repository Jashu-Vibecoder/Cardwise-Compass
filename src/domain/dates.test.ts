import { describe, expect, it } from 'vitest';
import { dateOnly, timestampAtLocalNoon } from './dates';

describe('profile timezone date handling', () => {
  it.each(['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Kiritimati'])('round trips date-only values in %s', (timezone) => {
    const timestamp = timestampAtLocalNoon('2026-10-01', timezone);
    expect(dateOnly(timestamp, timezone)).toBe('2026-10-01');
  });

  it('keeps date-only values stable without applying the browser timezone', () => {
    expect(dateOnly('2026-01-01', 'America/Los_Angeles')).toBe('2026-01-01');
  });
});
