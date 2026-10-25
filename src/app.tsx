import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { createPublicDemoWorkspace, getSession, isPreviewMode, loadWorkspace, requestPasswordReset, resetPreview, signIn, signOut, signUp } from './lib/data';
import { currentMonth } from './lib/format';
import { AppContext } from './lib/app-context';
import type { WorkspaceData } from './domain/types';
import { ToastProvider } from './components/Toast';
import { useToast } from './lib/use-toast';
import { AppShell } from './components/AppShell';
import { BrandMark } from './components/BrandMark';
import { SignInPage } from './pages/SignInPage';
import { shouldWaitForInitialSession } from './domain/session-state';
import { PasswordRecoveryPage } from './pages/PasswordRecoveryPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((page) => ({ default: page.DashboardPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((page) => ({ default: page.TransactionsPage })));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then((page) => ({ default: page.BudgetsPage })));
const CardsPage = lazy(() => import('./pages/CardsPage').then((page) => ({ default: page.CardsPage })));
const CardDetailsPage = lazy(() => import('./pages/CardDetailsPage').then((page) => ({ default: page.CardDetailsPage })));
const RewardsPage = lazy(() => import('./pages/RewardsPage').then((page) => ({ default: page.RewardsPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((page) => ({ default: page.InsightsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((page) => ({ default: page.ProfilePage })));

function LoadingScreen() {
  return <div className="loading-screen"><BrandMark /><span className="loader" /><p>Getting your compass ready</p></div>;
}

function ConfigurationScreen({ onExploreDemo }: { onExploreDemo: () => void }) {
  return <div className="config-screen"><div className="fatal-card"><div className="brand-lockup"><BrandMark /><div><span className="brand-name">cardwise</span><span className="brand-tagline">REWARD COMPASS</span></div></div><h1>Connect your Cardwise workspace</h1><p>This deployment needs a Supabase project URL and publishable key for personal accounts. You can still explore the fictional, demo.</p><button className="button button--primary auth-demo-button" onClick={onExploreDemo}>Explore demo</button><div className="config-instructions"><strong>Set these hosting environment variables:</strong><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div></div></div>;
}

function WorkspaceApp() {
  const [guestDemo, setGuestDemo] = useState(() => new URLSearchParams(window.location.search).get('demo') === '1');
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [pageError, setPageError] = useState('');
  const { notify } = useToast();
  const profileTimezone = data?.profile.timezone;

  useEffect(() => {
    if (profileTimezone) setMonth((selected) => selected === currentMonth() ? currentMonth(profileTimezone) : selected);
  }, [profileTimezone]);

  const refresh = useCallback(async () => {
    if (guestDemo) {
      setData(createPublicDemoWorkspace());
      setPageError('');
      return;
    }
    setPageError('');
    try {
      const next = await loadWorkspace();
      setData(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load your workspace.';
      setPageError(message);
      notify(message, 'error');
    }
  }, [notify, guestDemo]);

  const exploreDemo = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '1');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    setPageError('');
    setGuestDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    setGuestDemo(false);
    setPageError('');
  }, []);

  const exitPreview = useCallback(() => {
    resetPreview();
    window.location.reload();
  }, []);

  useEffect(() => {
    let active = true;
    if (guestDemo) {
      setSession(null);
      setSessionReady(true);
      return () => { active = false; };
    }
    if (!isSupabaseConfigured && import.meta.env.DEV) {
      void loadWorkspace().then((next) => { if (active) { setData(next); setSessionReady(true); setLoading(false); } });
      return () => { active = false; };
    }
    if (!isSupabaseConfigured) { setSessionReady(true); setLoading(false); return () => { active = false; }; }
    void getSession().then((value) => {
      if (active) { setSession(value); setSessionReady(true); }
    }).catch((error: unknown) => {
      if (active) {
        const message = error instanceof Error ? error.message : 'Could not check your session.';
        setPageError(message);
        setSessionReady(true);
        setLoading(false);
      }
    });
    const subscription = supabase?.auth.onAuthStateChange((event, value) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(value);
      setSessionReady(true);
    }).data.subscription;
    return () => { active = false; subscription?.unsubscribe(); };
  }, [guestDemo]);

  useEffect(() => {
    let active = true;
    if (guestDemo) {
      setData(createPublicDemoWorkspace());
      setLoading(false);
      return () => { active = false; };
    }
    if (!isSupabaseConfigured) return () => { active = false; };
    if (shouldWaitForInitialSession(isSupabaseConfigured, sessionReady)) return () => { active = false; };
    if (!session) {
      setData(null);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void loadWorkspace().then((next) => {
      if (active) setData(next);
    }).catch((error: unknown) => {
      if (active) setPageError(error instanceof Error ? error.message : 'Could not load your workspace.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, sessionReady, guestDemo]);

  const context = useMemo(() => data ? { data, month, setMonth, refresh, setBusy, busy, readOnly: false, isDemo: guestDemo } : null, [data, month, refresh, busy, guestDemo]);

  if (loading) return <LoadingScreen />;
  if (passwordRecovery) return <PasswordRecoveryPage onComplete={() => setPasswordRecovery(false)} />;
  if (!isSupabaseConfigured && !import.meta.env.DEV && !guestDemo) return <ConfigurationScreen onExploreDemo={exploreDemo} />;
  if (isSupabaseConfigured && !session && !guestDemo) return <SignInPage error={pageError} onSignIn={signIn} onSignUp={signUp} onResetPassword={requestPasswordReset} onExploreDemo={exploreDemo} />;
  if (!context) return <div className="fatal-state"><div className="fatal-card"><BrandMark /><h1>We couldn’t load your workspace</h1><p>{pageError || 'Please try again in a moment.'}</p><button className="button button--primary" onClick={() => void refresh()}>Try again</button><button className="text-button" onClick={() => void signOut()}>Sign out</button></div></div>;

  return (
    <AppContext.Provider value={context}>
      {guestDemo && <div className="preview-banner public-demo-banner"><span className="preview-dot" /> Public demo · fictional data · saved in this browser</div>}
      {!guestDemo && isPreviewMode() && <div className="preview-banner"><span className="preview-dot" /> Preview workspace · fictional sample records stored in this browser</div>}
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route element={<AppShell onSignOut={guestDemo ? exitDemo : isPreviewMode() ? exitPreview : () => void signOut()} />}>
              <Route index element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="cards/:cardId" element={<CardDetailsPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="rewards" element={<RewardsPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export function App() {
  return <ToastProvider><WorkspaceApp /></ToastProvider>;
}
