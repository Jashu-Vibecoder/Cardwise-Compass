export function shouldWaitForInitialSession(supabaseConfigured: boolean, sessionReady: boolean) {
  return supabaseConfigured && !sessionReady;
}
