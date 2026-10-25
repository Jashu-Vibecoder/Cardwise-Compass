import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

type SignInAction = (email: string, password: string) => Promise<unknown>;
type SignUpAction = (email: string, password: string, name: string) => Promise<unknown>;

export function SignInPage({ error, onSignIn, onSignUp }: { error: string; onSignIn: SignInAction; onSignUp: SignUpAction }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');
    setMessage('');
    if (!email.trim() || password.length < 8 || (mode === 'signup' && !name.trim())) {
      setLocalError(mode === 'signup' ? 'Add your name, a valid email, and a password with at least 8 characters.' : 'Enter your email and password (at least 8 characters).');
      return;
    }
    setBusy(true);
    try {
      const session = mode === 'signin'
        ? await onSignIn(email.trim(), password)
        : await onSignUp(email.trim(), password, name.trim());
      if (mode === 'signup' && !session) setMessage('Check your inbox to confirm your email, then sign in.');
    } catch (actionError) {
      setLocalError(actionError instanceof Error ? actionError.message : 'Authentication could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="brand-lockup brand-lockup--light">
          <div className="brand-mark"><span className="brand-glyph">c</span></div>
          <div><span className="brand-name">cardwise</span><span className="brand-tagline">REWARD COMPASS</span></div>
        </div>
        <div className="auth-story-copy">
          <div className="auth-kicker"><span /> YOUR FINANCES, WITH A LITTLE MORE CLARITY</div>
          <h1>Every card.<br /><em>One clear view.</em></h1>
          <p>See your spending, keep budgets on track, and make room for what matters.</p>
          <div className="auth-proof-list">
            <div><Check size={17} /><span>Your data stays yours</span></div>
            <div><Check size={17} /><span>No bank credentials stored</span></div>
            <div><Check size={17} /><span>Rewards shown only when rules are verified</span></div>
          </div>
        </div>
        <div className="auth-sparkle auth-sparkle--one" /><div className="auth-sparkle auth-sparkle--two" />
        <div className="auth-story-footer"><ShieldCheck size={15} /> Built for clarity. Designed for privacy.</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-mobile-brand brand-lockup">
          <div className="brand-mark"><span className="brand-glyph">c</span></div>
          <div><span className="brand-name">cardwise</span><span className="brand-tagline">REWARD COMPASS</span></div>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-title"><span className="eyebrow">WELCOME {mode === 'signin' ? 'BACK' : 'TO CARDWISE'}</span><h2>{mode === 'signin' ? 'Sign in to your account' : 'Create your account'}</h2><p>{mode === 'signin' ? 'Your financial picture is right where you left it.' : 'Start with the cards and transactions you want to track.'}</p></div>
          <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => { setMode('signin'); setLocalError(''); setMessage(''); }}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => { setMode('signup'); setLocalError(''); setMessage(''); }}>Create account</button></div>
          <form className="form-stack" onSubmit={submit}>
            {mode === 'signup' && <label className="field"><span>Your name</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ananya Rao" /></label>}
            <label className="field"><span>Email address</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label className="field"><span>Password</span><div className="password-field"><input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" className="icon-button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {(error || localError) && <div className="inline-error" role="alert">{localError || error}</div>}
            {message && <div className="inline-success" role="status">{message}</div>}
            <button className="button button--primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}<ArrowRight size={17} /></button>
          </form>
          <div className="auth-privacy"><ShieldCheck size={17} /><span>Your card PIN, CVV, and full card number are never requested.</span></div>
          {!isSupabaseConfigured && <p className="auth-config-note">Add Supabase settings in <code>.env.local</code> to enable accounts.</p>}
        </div>
        <div className="auth-legal">By continuing, you agree to use Cardwise for personal tracking. It does not provide financial advice.</div>
      </section>
    </div>
  );
}
