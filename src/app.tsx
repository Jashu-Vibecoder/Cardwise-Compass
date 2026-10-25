import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getSession, isPreviewMode, loadWorkspace, signIn, signOut, signUp } from './lib/data';
import { currentMonth } from './lib/format';
import { AppContext } from './lib/app-context';
import type { WorkspaceData } from './domain/types';
import { ToastProvider } from './components/Toast';
import { useToast } from './lib/use-toast';
import { AppShell } from './components/AppShell';
import { SignInPage } from './pages/SignInPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((page) => ({ default: page.DashboardPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((page) => ({ default: page.TransactionsPage })));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then((page) => ({ default: page.BudgetsPage })));
const CardsPage = lazy(() => import('./pages/CardsPage').then((page) => ({ default: page.CardsPage })));
const CardDetailsPage = lazy(() => import('./pages/CardDetailsPage').then((page) => ({ default: page.CardDetailsPage })));
const RewardsPage = lazy(() => import('./pages/RewardsPage').then((page) => ({ default: page.RewardsPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((page) => ({ default: page.InsightsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((page) => ({ default: page.ProfilePage })));

function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark"><span className="brand-glyph">c</span></div><span className="loader" /><p>Getting your compass ready</p></div>;
}

function ConfigurationScreen() {
  return <div className="config-screen"><div className="fatal-card"><div className="brand-lockup"><div className="brand-mark"><span className="brand-glyph">c</span></div><div><span className="brand-name">cardwise</span><span className="brand-tagline">REWARD COMPASS</span></div></div><h1>Connect your Cardwise workspace</h1><p>This deployment needs a Supabase project URL and publishable key. No demo account or sample profile is exposed in production.</p><div className="config-instructions"><strong>Set these hosting environment variables:</strong><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div></div></div>;
}

function WorkspaceApp() {
  const [session, setSession] = useState<Session | null>(null);
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
    setPageError('');
    try {
      const next = await loadWorkspace();
      setData(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load your workspace.';
      setPageError(message);
      notify(message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured && import.meta.env.DEV) {
      void loadWorkspace().then((next) => { if (active) { setData(next); setLoading(false); } });
      return () => { active = false; };
    }
    if (!isSupabaseConfigured) { setLoading(false); return () => { active = false; }; }
    void getSession().then((value) => {
      if (active) setSession(value);
    }).catch((error: unknown) => {
      if (active) {
        const message = error instanceof Error ? error.message : 'Could not check your session.';
        setPageError(message);
        setLoading(false);
      }
    });
    const subscription = supabase?.auth.onAuthStateChange((_event, value) => {
      setSession(value);
    }).data.subscription;
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
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
  }, [session]);

  const context = useMemo(() => data ? { data, month, setMonth, refresh, setBusy, busy } : null, [data, month, refresh, busy]);

  if (loading) return <LoadingScreen />;
  if (!isSupabaseConfigured && !import.meta.env.DEV) return <ConfigurationScreen />;
  if (isSupabaseConfigured && !session) return <SignInPage error={pageError} onSignIn={signIn} onSignUp={signUp} />;
  if (!context) return <div className="fatal-state"><div className="fatal-card"><div className="brand-mark"><span className="brand-glyph">c</span></div><h1>We couldn’t load your workspace</h1><p>{pageError || 'Please try again in a moment.'}</p><button className="button button--primary" onClick={() => void refresh()}>Try again</button><button className="text-button" onClick={() => void signOut()}>Sign out</button></div></div>;

  return (
    <AppContext.Provider value={context}>
      {isPreviewMode() && <div className="preview-banner"><span className="preview-dot" /> Preview workspace · fictional sample records stored in this browser</div>}
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route element={<AppShell onSignOut={() => void signOut()} />}>
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
