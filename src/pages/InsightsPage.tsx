import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleHelp, Lightbulb, Search, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { budgetSpent, categoryComparison, monthKey } from '../domain/finance';
import { formatCurrency, monthLabel, parseINRAmount, shortDate } from '../lib/format';
import { findCategoryAskedAbout } from '../domain/insights';
import { Link } from 'react-router-dom';

function previousMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
}

export function InsightsPage() {
  const { data, month } = useApp();
  const timezone = data.profile.timezone;
  const currency = data.profile.preferred_currency;
  const money = (minor: number) => formatCurrency(minor, currency);
  const [question, setQuestion] = useState('Which category changed the most compared with last month?');
  const [answer, setAnswer] = useState('');
  const [purchase, setPurchase] = useState('');
  const [purchaseResult, setPurchaseResult] = useState('');
  const comparison = useMemo(() => categoryComparison(data.transactions, month, data.categories, timezone, currency), [data.transactions, month, data.categories, timezone, currency]);
  const previous = previousMonth(month);
  const currentMonthRows = data.transactions.filter((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === month);
  const recurring = currentMonthRows.filter((row) => row.recurring);
  const rising = comparison.filter((item) => item.previousMinor > 0 && item.changeMinor >= item.previousMinor * 0.5).sort((a, b) => b.changeMinor - a.changeMinor);
  const overall = data.budgets.find((budget) => budget.category_id === null && budget.period_start.slice(0, 7) === month);
  const remainingMinor = overall ? overall.limit_minor - Math.max(0, budgetSpent(data.transactions, overall, timezone)) : null;

  function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = question.toLowerCase();
    const askedCategory = findCategoryAskedAbout(question, data.categories);
    if (!currentMonthRows.some((row) => row.transaction_type === 'expense') && !data.transactions.some((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === previous && row.transaction_type === 'expense')) {
      setAnswer(`There isn’t enough transaction data to compare ${monthLabel(month)} with ${monthLabel(previous)}.`);
      return;
    }
    if (askedCategory) {
      const categoryNet = (rows: typeof currentMonthRows) => rows
        .filter((row) => row.category_id === askedCategory.id && (row.transaction_type === 'expense' || row.transaction_type === 'refund'))
        .reduce((sum, row) => sum + (row.transaction_type === 'refund' ? -row.amount_minor : row.amount_minor), 0);
      const previousRows = data.transactions.filter((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === previous);
      setAnswer(`${monthLabel(month)} spending in ${askedCategory.name} is ${money(categoryNet(currentMonthRows))}; it was ${money(categoryNet(previousRows))} in ${monthLabel(previous)}. Refunds reduce the total.`);
      return;
    }
    if (normalized.includes('categor') || normalized.includes('increased') || normalized.includes('changed') || normalized.includes('rose')) {
      const greatest = [...comparison].sort((left, right) => Math.abs(right.changeMinor) - Math.abs(left.changeMinor))[0];
      if (!greatest || greatest.currentMinor === 0 && greatest.previousMinor === 0) {
        setAnswer(`No category spending is recorded in ${monthLabel(month)} or ${monthLabel(previous)}.`);
      } else {
        const direction = greatest.changeMinor > 0 ? 'increased' : greatest.changeMinor < 0 ? 'decreased' : 'stayed level';
        setAnswer(`${greatest.name} changed the most: it ${direction} by ${money(Math.abs(greatest.changeMinor))}, from ${money(greatest.previousMinor)} in ${monthLabel(previous)} to ${money(greatest.currentMinor)} in ${monthLabel(month)}.`);
      }
      return;
    }
    if (normalized.includes('spend') || normalized.includes('spent') || normalized.includes('expense')) {
      const total = currentMonthRows.filter((row) => row.transaction_type === 'expense').reduce((sum, row) => sum + row.amount_minor, 0);
      const refunds = currentMonthRows.filter((row) => row.transaction_type === 'refund').reduce((sum, row) => sum + row.amount_minor, 0);
      setAnswer(`Recorded net spending in ${monthLabel(month)} is ${money(total - refunds)} after ${money(refunds)} in refunds. Transfers and income are not included.`);
      return;
    }
    setAnswer('I can compare categories between months or summarize recorded spending. Try asking which category changed most, or how much was spent this month.');
  }

  function checkPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseINRAmount(purchase);
    if (amountMinor === null) { setPurchaseResult('Enter a purchase amount in rupees, such as 2500.'); return; }
    if (remainingMinor === null) { setPurchaseResult('Set an overall monthly budget to compare this planned purchase with a remaining budget.'); return; }
    const after = remainingMinor - amountMinor;
    setPurchaseResult(after >= 0 ? `Your budget would have ${money(after)} remaining after this planned ${money(amountMinor)} purchase.` : `This planned purchase would put you ${money(Math.abs(after))} over the remaining budget. This is an estimate, not a decision about affordability.`);
  }

  return <div className="page-content">
    <PageHeader eyebrow="YOUR PATTERNS, EXPLAINED" title="Insights" description={`A grounded look at recorded activity for ${monthLabel(month)}.`} />
    <section className="insight-feature-grid">
      <article className="insight-question-card">
        <div className="insight-card-heading"><span className="insight-big-icon"><Sparkles size={19} /></span><div><h2>Ask about your spending</h2><p>Answers come from saved transactions in this account.</p></div></div>
        <form className="question-form" onSubmit={ask}><label className="field"><span>Your question</span><div className="question-input"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your recorded spending" /><button type="submit" aria-label="Answer question"><Search size={17} /></button></div></label><div className="question-suggestion-row"><button type="button" onClick={() => setQuestion('Which category changed the most compared with last month?')}>Category changes</button><button type="button" onClick={() => setQuestion('How much did I spend this month?')}>Monthly spending</button></div></form>
        {answer && <div className="grounded-answer"><span className="answer-label"><ShieldCheck size={14} /> CALCULATED FROM YOUR RECORDS</span><p>{answer}</p><small>Period used: {monthLabel(month)} and {monthLabel(previous)} · transfers excluded · refunds reduce spending</small></div>}
        <div className="not-ai-note"><CircleHelp size={14} />These are deterministic summaries. Cardwise does not send your transactions to an AI service.</div>
      </article>

      <article className="affordability-card">
        <div className="affordability-head"><span className="affordability-icon"><Wallet size={18} /></span><span className="eyebrow">A QUICK ESTIMATE</span></div><h2>Planning a purchase?</h2><p>See how it might fit against your remaining monthly tracking budget.</p>
        <form onSubmit={checkPurchase} className="purchase-form"><label className="field"><span>Planned amount</span><div className="money-input"><span>₹</span><input value={purchase} onChange={(event) => setPurchase(event.target.value)} inputMode="decimal" placeholder="0.00" /></div></label><button className="button button--soft" type="submit">Check budget impact <ArrowUpRight size={15} /></button></form>
        {purchaseResult && <div className="purchase-result" role="status">{purchaseResult}</div>}
        {remainingMinor !== null ? <div className="remaining-context"><span>Current budget remaining</span><strong className={remainingMinor < 0 ? 'tone-negative' : ''}>{money(remainingMinor)}</strong></div> : <div className="remaining-context"><span>No overall budget for {monthLabel(month)}</span><Link to="/budgets">Set a budget</Link></div>}
        <div className="estimate-footnote"><CircleHelp size={13} />Known upcoming commitments are included only if you recorded them.</div>
      </article>
    </section>

    <section className="panel category-compare-panel">
      <div className="panel-header"><div><div className="panel-title">Month-to-month movement</div><div className="panel-subtitle">{monthLabel(previous)} compared with {monthLabel(month)}</div></div><span className="compare-period"><ArrowDownRight size={14} />Recorded expenses only</span></div>
      {comparison.some((item) => item.currentMinor > 0 || item.previousMinor > 0) ? <div className="category-compare-list">{comparison.filter((item) => item.currentMinor > 0 || item.previousMinor > 0).map((item) => {
        const max = Math.max(item.currentMinor, item.previousMinor, 1);
        return <div className="compare-row" key={item.id}><div className="compare-row-label"><i style={{ background: item.color }} /><strong>{item.name}</strong><span className={item.changeMinor > 0 ? 'tone-negative' : item.changeMinor < 0 ? 'tone-positive' : ''}>{item.changeMinor === 0 ? 'No change' : `${item.changeMinor > 0 ? '+' : '−'}${money(Math.abs(item.changeMinor))}`}</span></div><div className="compare-bars"><div className="compare-bar-line"><span>{monthLabel(previous).slice(0, 3)}</span><div className="compare-track"><div className="compare-fill compare-fill--previous" style={{ width: `${(item.previousMinor / max) * 100}%` }} /></div><strong>{money(item.previousMinor)}</strong></div><div className="compare-bar-line"><span>{monthLabel(month).slice(0, 3)}</span><div className="compare-track"><div className="compare-fill" style={{ width: `${(item.currentMinor / max) * 100}%`, background: item.color }} /></div><strong>{money(item.currentMinor)}</strong></div></div></div>;
      })}</div> : <div className="chart-empty chart-empty--compact"><strong>Not enough history to compare</strong><span>Add categorized transactions in both months to see the change.</span></div>}
    </section>

    <section className="insights-lower-grid">
      <article className="panel unusual-panel"><div className="panel-header"><div><div className="panel-title">Worth a look</div><div className="panel-subtitle">Transparent spending flags</div></div><span className="soft-icon"><Lightbulb size={17} /></span></div>
        {rising.length ? <div className="unusual-list">{rising.slice(0, 4).map((item) => <div className="unusual-row" key={item.id}><span className="unusual-arrow"><ArrowUpRight size={15} /></span><span><strong>{item.name} is up {Math.round((item.changeMinor / item.previousMinor) * 100)}%</strong><small>{money(item.currentMinor)} this month vs {money(item.previousMinor)} last month</small></span></div>)}<p className="algorithm-note">Flags appear when a category is at least 50% above a non-zero previous-month total. This is a prompt to review, not a judgment.</p></div> : <div className="chart-empty chart-empty--compact"><strong>No large shifts flagged</strong><span>We only flag categories that are at least 50% above last month.</span></div>}
      </article>
      <article className="panel recurring-panel"><div className="panel-header"><div><div className="panel-title">Recurring you marked</div><div className="panel-subtitle">Confirmed by your own label</div></div><span className="recurring-count">{recurring.length}</span></div>
        {recurring.length ? <div className="recurring-list">{recurring.map((item) => <div className="recurring-row" key={item.id}><span className="recurring-dot" /><div><strong>{item.merchant}</strong><small>{item.description || 'Recurring transaction'} · {shortDate(item.occurred_at, timezone)}</small></div><span>{money(item.amount_minor)}</span></div>)}</div> : <div className="chart-empty chart-empty--compact"><strong>No recurring transactions marked</strong><span>Mark a transaction as recurring when you’re sure it repeats.</span></div>}
      </article>
    </section>
  </div>;
}
