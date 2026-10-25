import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeIndianRupee, CircleHelp, Plus, ReceiptText, Sparkles, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { TransactionForm } from '../components/TransactionForm';
import { useToast } from '../lib/use-toast';
import { budgetSpent, categoryComparison, categoryTotals, monthlySummary, sumTransactions } from '../domain/finance';
import { formatCurrency, monthLabel, percent, shortDate } from '../lib/format';
import { saveTransaction } from '../lib/data';
import type { TransactionInput } from '../domain/types';
import { dateOnly } from '../domain/dates';
import { monthKey } from '../domain/finance';

function weeklySpending(transactions: ReturnType<typeof useApp>['data']['transactions'], month: string, timezone: string, currency: string) {
  const output = [
    { week: '1–7', expense: 0 }, { week: '8–14', expense: 0 }, { week: '15–21', expense: 0 }, { week: '22–31', expense: 0 },
  ];
  for (const row of transactions) {
    const date = dateOnly(row.occurred_at, timezone);
    if (row.currency !== currency || monthKey(date, timezone) !== month || (row.transaction_type !== 'expense' && row.transaction_type !== 'refund')) continue;
    const day = Number(date.slice(8, 10));
    const index = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    output[index].expense += row.transaction_type === 'refund' ? -row.amount_minor : row.amount_minor;
  }
  return output.map((row) => ({ ...row, expense: Math.max(0, row.expense) / 100 }));
}

function CustomTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><span>{label}</span><strong>{formatCurrency(Math.round(payload[0].value * 100), currency)}</strong></div>;
}

export function DashboardPage() {
  const { data, month, refresh, setBusy, busy, readOnly } = useApp();
  const timezone = data.profile.timezone;
  const currency = data.profile.preferred_currency;
  const money = (minor: number) => formatCurrency(minor, currency);
  const { notify } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const summary = useMemo(() => monthlySummary(data.transactions, month, timezone, currency), [data.transactions, month, timezone, currency]);
  const categories = useMemo(() => categoryTotals(data.transactions, month, data.categories, timezone, currency), [data.transactions, month, data.categories, timezone, currency]);
  const comparison = useMemo(() => categoryComparison(data.transactions, month, data.categories, timezone, currency).filter((item) => item.changeMinor !== 0).slice(0, 3), [data.transactions, month, data.categories, timezone, currency]);
  const totalBudget = data.budgets.find((item) => item.category_id === null && item.period_start.slice(0, 7) === month);
  const spent = totalBudget ? Math.max(0, budgetSpent(data.transactions, totalBudget, timezone)) : summary.expensesMinor;
  const remaining = totalBudget ? totalBudget.limit_minor - spent : null;
  const chart = weeklySpending(data.transactions, month, timezone, currency);
  const recent = [...data.transactions].filter((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === month).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 5);
  const currentIncome = sumTransactions(data.transactions, month, timezone, currency).incomeMinor;
  const monthChange = summary.expenseChangePercent;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  async function addTransaction(value: TransactionInput) {
    if (readOnly) return;
    setBusy(true);
    try {
      await saveTransaction(value);
      await refresh();
      setAddOpen(false);
      notify('Transaction added. Your totals are up to date.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transaction could not be saved.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content" data-read-only={readOnly}>
      <PageHeader eyebrow={monthLabel(month).toUpperCase()} title={`${greeting}, ${data.profile.display_name.split(' ')[0]}`} description="Here’s your spending picture, all in one place." action={!readOnly && <button className="button button--primary" onClick={() => setAddOpen(true)}><Plus size={17} /> Add transaction</button>} />

      <section className="metric-grid" aria-label="Monthly financial summary">
        <article className="metric-card metric-card--primary"><div className="metric-topline"><span>Net spending</span><span className="metric-icon"><WalletCards size={17} /></span></div><strong>{money(summary.expensesMinor)}</strong><div className="metric-foot"><span className={monthChange === null ? '' : monthChange > 0 ? 'tone-negative' : monthChange < 0 ? 'tone-positive' : ''}>{monthChange === null ? 'No previous month data' : <>{monthChange > 0 ? <ArrowUpRight size={14} /> : monthChange < 0 ? <ArrowDownRight size={14} /> : null}{percent(monthChange)} vs last month</>}</span><span>Refunds reduce spending</span></div></article>
        <article className="metric-card"><div className="metric-topline"><span>Income recorded</span><span className="metric-icon metric-icon--green"><ArrowDownRight size={17} /></span></div><strong>{money(currentIncome)}</strong><div className="metric-foot"><span className="tone-positive">This month</span><span>From saved transactions</span></div></article>
        <article className="metric-card"><div className="metric-topline"><span>Net cash flow</span><span className="metric-icon metric-icon--blue"><ArrowRight size={17} /></span></div><strong className={summary.netMinor < 0 ? 'metric-negative' : ''}>{money(summary.netMinor)}</strong><div className="metric-foot"><span>{summary.netMinor < 0 ? 'Spending is above income' : 'Income after spending'}</span><span>Transfers excluded</span></div></article>
        <article className="metric-card"><div className="metric-topline"><span>Budget remaining</span><span className="metric-icon metric-icon--amber"><ReceiptText size={17} /></span></div><strong>{remaining === null ? '—' : money(remaining)}</strong><div className="metric-foot"><span>{totalBudget ? `of ${money(totalBudget.limit_minor)} monthly budget` : 'No monthly budget set'}</span>{totalBudget && <Link to="/budgets">View budget</Link>}</div></article>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel spending-panel">
          <div className="panel-header"><div><div className="panel-title">Spending rhythm</div><div className="panel-subtitle">Expense and refund records · {monthLabel(month)}</div></div><div className="chart-key"><span><i /> Spend</span></div></div>
          {chart.some((row) => row.expense > 0) ? <div className="chart-wrap chart-wrap--bars"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 14, right: 6, left: -17, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="4 4" /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#8c96a4', fontSize: 11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c96a4', fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value)} /><Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: '#f4f7fa' }} /><Bar dataKey="expense" fill="#5f7ce8" radius={[6, 6, 1, 1]} maxBarSize={42} /></BarChart></ResponsiveContainer></div> : <div className="chart-empty"><div className="empty-illustration"><ReceiptText size={24} /></div><strong>No spending recorded yet</strong><span>Add a transaction to see your month take shape.</span></div>}
          <div className="chart-footnote"><span className="chart-footnote-dot" />Only recorded transactions are included.</div>
        </article>

        <article className="panel category-panel">
          <div className="panel-header"><div><div className="panel-title">Where it goes</div><div className="panel-subtitle">By category · {monthLabel(month)}</div></div><Link className="panel-link" to="/transactions">Details <ArrowRight size={14} /></Link></div>
          {categories.length ? <>
            <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="currentMinor" nameKey="name" innerRadius={57} outerRadius={80} paddingAngle={3} stroke="none"><>{categories.map((item) => <Cell key={item.id} fill={item.color} />)}</></Pie><Tooltip formatter={(value) => money(Number(value))} contentStyle={{ border: '1px solid #e9edf2', borderRadius: 12, fontFamily: 'DM Sans', fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><span>Total</span><strong>{money(summary.expensesMinor)}</strong></div></div>
            <div className="category-legend">{categories.slice(0, 4).map((category) => <div className="legend-row" key={category.id}><span className="legend-label"><i style={{ background: category.color }} />{category.name}</span><strong>{money(category.currentMinor)}</strong></div>)}{categories.length > 4 && <Link to="/transactions" className="more-categories">+ {categories.length - 4} more categories</Link>}</div>
          </> : <div className="chart-empty chart-empty--compact"><strong>No categories yet</strong><span>Save a categorized transaction to see a breakdown.</span></div>}
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--lower">
        <article className="panel budget-panel">
          <div className="panel-header"><div><div className="panel-title">Budget check-in</div><div className="panel-subtitle">A little context for this month</div></div><Link className="panel-link" to="/budgets">All budgets <ArrowRight size={14} /></Link></div>
          {totalBudget ? <div className="budget-summary">
            <div className="budget-amounts"><div><strong>{money(spent)}</strong><span>spent so far</span></div><div className="budget-remaining"><strong>{money(Math.max(0, remaining ?? 0))}</strong><span>left of {money(totalBudget.limit_minor)}</span></div></div>
            <div className="progress-track"><div className={`progress-fill ${spent / totalBudget.limit_minor >= 1 ? 'progress-fill--over' : spent / totalBudget.limit_minor >= 0.8 ? 'progress-fill--warn' : ''}`} style={{ width: `${Math.min(100, totalBudget.limit_minor ? (spent / totalBudget.limit_minor) * 100 : 0)}%` }} /></div>
            <div className="budget-status-line"><span>{Math.round(totalBudget.limit_minor ? (spent / totalBudget.limit_minor) * 100 : 0)}% of monthly tracking budget</span>{spent / totalBudget.limit_minor >= 1 ? <span className="status-pill status-pill--danger">Over budget</span> : spent / totalBudget.limit_minor >= 0.8 ? <span className="status-pill status-pill--warning">Nearly there</span> : <span className="status-pill status-pill--good">On track</span>}</div>
            <p className="note-line"><CircleHelp size={14} />Budget values are set by you; they are not bank credit limits.</p>
          </div> : <div className="budget-empty"><p>Give your month a helpful spending boundary.</p>{!readOnly && <Link className="button button--soft" to="/budgets">Set a budget <ArrowRight size={15} /></Link>}</div>}
        </article>

        <article className="panel movers-panel">
          <div className="panel-header"><div><div className="panel-title">A useful nudge</div><div className="panel-subtitle">Compared with last month</div></div><span className="soft-icon"><Sparkles size={17} /></span></div>
          {comparison.length > 0 ? <div className="mover-list">{comparison.map((category) => <div className="mover-row" key={category.id}><span className="mover-category"><i style={{ background: category.color }} />{category.name}</span><span className={category.changeMinor > 0 ? 'tone-negative' : 'tone-positive'}>{category.changeMinor > 0 ? '+' : '−'}{money(Math.abs(category.changeMinor))}</span></div>)}<div className="insight-callout"><span className="insight-sparkle"><Sparkles size={14} /></span><span>{comparison[0].changeMinor > 0 ? `${comparison[0].name} is up the most from last month.` : `${comparison[0].name} is down the most from last month.`}</span></div><Link to="/insights" className="text-link">See your insights <ArrowRight size={14} /></Link></div> : <div className="budget-empty"><p>Add transaction history to surface a meaningful month-to-month comparison.</p><Link to="/insights" className="text-link">Explore insights <ArrowRight size={14} /></Link></div>}
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="panel recent-panel">
          <div className="panel-header"><div><div className="panel-title">Recent transactions</div><div className="panel-subtitle">Your latest activity this month</div></div><Link className="panel-link" to="/transactions">View all <ArrowRight size={14} /></Link></div>
          {recent.length ? <div className="recent-list">{recent.map((transaction) => {
            const category = data.categories.find((item) => item.id === transaction.category_id);
            const amountPrefix = transaction.transaction_type === 'income' || transaction.transaction_type === 'refund' ? '+' : transaction.transaction_type === 'transfer' ? '' : '−';
            return <div className="recent-row" key={transaction.id}><div className="transaction-icon" style={{ '--category-color': category?.color ?? '#9aa5b5' } as React.CSSProperties}><span>{category?.name.slice(0, 1) ?? '·'}</span></div><div className="recent-main"><strong>{transaction.merchant}</strong><span>{category?.name ?? 'Uncategorized'} · {shortDate(transaction.occurred_at, timezone)}</span></div><div className={`recent-amount ${transaction.transaction_type === 'income' || transaction.transaction_type === 'refund' ? 'tone-positive' : ''}`}><strong>{amountPrefix}{money(transaction.amount_minor)}</strong>{transaction.is_demo && <span className="demo-badge">DEMO</span>}</div></div>;
          })}</div> : <div className="chart-empty chart-empty--compact"><strong>Nothing here yet</strong><span>Your saved activity will show up here.</span></div>}
        </article>
        <article className="panel cards-preview-panel">
          <div className="panel-header"><div><div className="panel-title">Your cards</div><div className="panel-subtitle">{data.cards.length} saved card{data.cards.length === 1 ? '' : 's'}</div></div><Link className="panel-link" to="/cards">Manage <ArrowRight size={14} /></Link></div>
          {data.cards.slice(0, 3).map((card, index) => <div className="mini-card-row" key={card.id}><div className={`mini-card-chip mini-card-chip--${index % 4}`}><span /></div><div><strong>{card.catalog.card_name}</strong><span>{card.catalog.issuer_name}</span></div><div className="mini-card-verify" title="Card name verified; rewards not verified"><span className="verify-dot" />Identity</div></div>)}
          {!readOnly && <Link to="/cards" className="add-card-dash"><span><Plus size={16} /></span>Add a card to your wallet</Link>}
          <div className="rewards-no-data"><BadgeIndianRupee size={15} /><span>Reward estimates appear only when card rules are verified.</span></div>
        </article>
      </section>
      {addOpen && <Modal title="Add a transaction" description="Record a purchase, refund, income, or transfer." onClose={() => setAddOpen(false)}><TransactionForm onSubmit={addTransaction} onCancel={() => setAddOpen(false)} busy={busy} /></Modal>}
    </div>
  );
}
