import { describe, expect, it, vi } from 'vitest';
import { requestPasswordReset, updateRecoveredPassword } from './password-recovery';

describe('password recovery helpers', () => {
  it('requests a recovery email with the app redirect URL', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    await requestPasswordReset({ auth: { resetPasswordForEmail } }, 'person@example.com', 'https://app.example/reset-password');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', { redirectTo: 'https://app.example/reset-password' });
  });

  it('passes the chosen password to Supabase after recovery', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    await updateRecoveredPassword({ auth: { updateUser } }, 'A-new-password-123');
    expect(updateUser).toHaveBeenCalledWith({ password: 'A-new-password-123' });
  });
});
