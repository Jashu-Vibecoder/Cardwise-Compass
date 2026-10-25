import { describe, expect, it } from 'vitest';
import { isPublicDemoLocation, PUBLIC_DEMO_STORAGE_KEY, usesLocalWorkspace, workspaceStorageKey } from './workspace-mode';

describe('public demo isolation', () => {
  it('routes a public demo to local storage even when Supabase is configured', () => {
    expect(usesLocalWorkspace(true, true)).toBe(true);
    expect(workspaceStorageKey(true)).toBe(PUBLIC_DEMO_STORAGE_KEY);
    expect(workspaceStorageKey(false)).toBe('cardwise-preview-v1');
  });

  it('recognizes the explicit demo URL and keeps normal configured sessions remote', () => {
    expect(isPublicDemoLocation('?demo=1')).toBe(true);
    expect(isPublicDemoLocation('?demo=0')).toBe(false);
    expect(usesLocalWorkspace(false, true)).toBe(false);
  });
});
