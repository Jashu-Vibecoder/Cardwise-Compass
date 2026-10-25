import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { saveRecoveredPassword } from '../lib/data';

export function PasswordRecoveryPage({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters for your new password.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try { await saveRecoveredPassword(password); onComplete(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Your password could not be updated. Request a new recovery email and try again.'); }
    finally { setBusy(false); }
  }

  return <main className="recovery-page"><section className="recovery-card"><div className="brand-lockup"><BrandMark /><div><span className="brand-name">cardwise</span><span className="brand-tagline">REWARD COMPASS</span></div></div><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Choose a new password</h1><p>Set a new password for your Cardwise account.</p><form className="form-stack" onSubmit={(event) => void submit(event)}><label className="field"><span>New password</span><input autoFocus type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <div className="inline-error" role="alert">{error}</div>}<button className="button button--primary auth-submit" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}<ArrowRight size={17} /></button></form><div className="auth-privacy"><ShieldCheck size={17} /><span>Your password is handled by Supabase Auth.</span></div></section></main>;
}
