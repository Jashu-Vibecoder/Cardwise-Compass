import { describe, expect, it } from 'vitest';
import { shouldWaitForInitialSession } from './session-state';

describe('initial auth restoration state', () => {
  it('keeps the app loading until configured auth has restored a session', () => {
    expect(shouldWaitForInitialSession(true, false)).toBe(true);
    expect(shouldWaitForInitialSession(true, true)).toBe(false);
  });

  it('does not wait for auth when Supabase is not configured', () => {
    expect(shouldWaitForInitialSession(false, false)).toBe(false);
  });
});
