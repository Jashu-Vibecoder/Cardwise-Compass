type PasswordResetClient = { auth: { resetPasswordForEmail: (email: string, options: { redirectTo: string }) => Promise<{ error: { message: string } | null }> } };
type RecoveredPasswordClient = { auth: { updateUser: (attributes: { password: string }) => Promise<{ error: { message: string } | null }> } };

export async function requestPasswordReset(client: PasswordResetClient, email: string, redirectTo: string) {
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updateRecoveredPassword(client: RecoveredPasswordClient, password: string) {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
