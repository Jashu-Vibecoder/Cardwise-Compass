export const PUBLIC_DEMO_STORAGE_KEY = 'cardwise-public-demo-v1';
export const PREVIEW_STORAGE_KEY = 'cardwise-preview-v1';

export function workspaceStorageKey(publicDemo: boolean) {
  return publicDemo ? PUBLIC_DEMO_STORAGE_KEY : PREVIEW_STORAGE_KEY;
}

export function isPublicDemoLocation(search: string) {
  return new URLSearchParams(search).get('demo') === '1';
}

export function usesLocalWorkspace(publicDemo: boolean, supabaseConfigured: boolean) {
  return publicDemo || !supabaseConfigured;
}
