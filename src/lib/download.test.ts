import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleObjectUrlRevocation } from './download';

describe('download cleanup', () => {
  afterEach(() => vi.useRealTimers());
  it('keeps the object URL alive briefly for the browser to start the download', () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    scheduleObjectUrlRevocation('blob:export');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:export');
    revoke.mockRestore();
  });
});
