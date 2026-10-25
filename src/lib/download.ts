export function scheduleObjectUrlRevocation(url: string, delayMs = 1000) {
  window.setTimeout(() => URL.revokeObjectURL(url), delayMs);
}
