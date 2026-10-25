export async function readFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== 'object' || !('json' in context) || typeof context.json !== 'function') return null;
  try {
    const payload: unknown = await (context.json as () => Promise<unknown>)();
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.error === 'string' && record.error.trim()) return record.error;
    return null;
  } catch {
    return null;
  }
}
