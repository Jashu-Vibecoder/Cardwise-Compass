import { NavLink, Outlet } from 'react-router-dom';
import { Activity, ArrowLeftRight, BadgeIndianRupee, CircleUserRound, CreditCard, Gauge, LayoutDashboard, LogOut, Sparkles } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { currentMonth, monthLabel } from '../lib/format';
import { isPreviewMode } from '../lib/data';
import { BrandMark } from './BrandMark';
import { monthOptions } from '../domain/months';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: Gauge },
  { to: '/cards', label: 'My cards', icon: CreditCard },
  { to: '/rewards', label: 'Rewards', icon: BadgeIndianRupee },
  { to: '/insights', label: 'Insights', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
];

export function AppShell({ onSignOut }: { onSignOut: () => void }) {
  const { data, month, setMonth, isDemo } = useApp();
  const activeDateOptions = monthOptions(currentMonth(data.profile.timezone), month);
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup">
          <BrandMark />
          <div><span className="brand-name">cardwise</span><span className="brand-tagline">REWARD COMPASS</span></div>
        </div>
        <div className="sidebar-caption">YOUR MONEY, IN VIEW</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Rewards' && <span className="nav-mini-pill">NEW</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-card-icon"><Activity size={17} /></div>
          <strong>Clearer money days</strong>
          <p>Understand your spending, one month at a time.</p>
        </div>
        <div className="sidebar-user">
          <div className="avatar avatar--small">{data.profile.display_name.slice(0, 1)}</div>
          <div className="sidebar-user-copy"><strong>{data.profile.display_name}</strong><span>{data.profile.city || 'Your profile'}</span></div>
          {(!isPreviewMode() || isDemo) && <button className="icon-button sidebar-logout" aria-label={isDemo ? 'Exit demo' : 'Sign out'} title={isDemo ? 'Exit demo' : 'Sign out'} onClick={onSignOut}><LogOut size={16} /></button>}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>Personal</strong></div>
          <div className="topbar-actions">
            <label className="month-picker"><span className="sr-only">Select month</span><select value={month} onChange={(event) => setMonth(event.target.value)}>{activeDateOptions.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}</select></label>
            <div className="avatar top-avatar" title={data.profile.display_name}>{data.profile.display_name.slice(0, 1)}</div>
          </div>
        </header>
        <div className="page-scroll"><Outlet /></div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`}>
            <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
