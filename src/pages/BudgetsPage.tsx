import { useMemo, useState } from 'react';
import { Gauge, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { BudgetForm } from '../components/BudgetForm';
import { useToast } from '../lib/use-toast';
import { budgetSpent } from '../domain/finance';
import { formatINR, monthLabel } from '../lib/format';
import { removeBudget, saveBudget } from '../lib/data';
import type { Budget, BudgetInput } from '../domain/types';

export function BudgetsPage() {
  const { data, month, refresh, setBusy, busy } = useApp();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const budgets = useMemo(() => data.budgets.filter((budget) => budget.period_start.slice(0, 7) === month), [data.budgets, month]);
  const total = budgets.filter((budget) => budget.category_id === null);
  const categoryBudgets = budgets.filter((budget) => budget.category_id !== null);

  async function save(input: BudgetInput) {
    setBusy(true);
    try {
      await saveBudget(input, editing?.id);
      await refresh();
      setOpen(false);
      setEditing(null);
      notify(editing ? 'Budget updated.' : 'Budget created.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Budget could not be saved.', 'error'); }
    finally { setBusy(false); }
  }

  async function remove(budget: Budget) {
    if (!window.confirm('Delete this budget? Your transactions will stay in place.')) return;
    setBusy(true);
    try { await removeBudget(budget.id); await refresh(); notify('Budget deleted.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Budget could not be deleted.', 'error'); }
    finally { setBusy(false); }
  }

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(item: Budget) { setEditing(item); setOpen(true); }

  function card(budget: Budget) {
    const spent = Math.max(0, budgetSpent(data.transactions, budget));
    const ratio = budget.limit_minor ? spent / budget.limit_minor : 0;
    const category = data.categories.find((item) => item.id === budget.category_id);
    const tone = ratio >= 1 ? 'progress-fill--over' : ratio >= 0.8 ? 'progress-fill--warn' : '';
    return <article className="budget-card" key={budget.id}>
      <div className="budget-card-top"><div className="budget-card-heading"><span className="budget-category-dot" style={{ background: category?.color ?? '#526ebc' }} /><div><h3>{category?.name ?? 'Overall monthly budget'}</h3><p>{category ? 'Category spending limit' : 'All eligible spending'}</p></div></div><div className="row-actions"><button className="icon-button" aria-label={`Edit ${category?.name ?? 'overall'} budget`} onClick={() => openEdit(budget)}><Pencil size={15} /></button><button className="icon-button icon-button--danger" aria-label={`Delete ${category?.name ?? 'overall'} budget`} onClick={() => void remove(budget)}><Trash2 size={15} /></button></div></div>
      <div className="budget-card-numbers"><div><strong>{formatINR(spent)}</strong><span>spent</span></div><div className="budget-limit"><strong>{formatINR(budget.limit_minor)}</strong><span>monthly limit</span></div></div>
      <div className="progress-track progress-track--large"><div className={`progress-fill ${tone}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
      <div className="budget-card-bottom"><span>{Math.round(ratio * 100)}% used</span><span className={ratio >= 1 ? 'tone-negative' : ratio >= 0.8 ? 'tone-warning' : 'tone-positive'}>{ratio >= 1 ? `${formatINR(spent - budget.limit_minor)} over` : `${formatINR(budget.limit_minor - spent)} remaining`}</span></div>
      {ratio >= 0.8 && <div className={`budget-alert ${ratio >= 1 ? 'budget-alert--over' : ''}`}><span>{ratio >= 1 ? 'Budget crossed' : 'Approaching your limit'}</span><small>{ratio >= 1 ? 'Your tracked spending has passed this amount.' : 'You have used at least 80% of this month’s budget.'}</small></div>}
    </article>;
  }

  return <div className="page-content">
    <PageHeader eyebrow="PLAN WITH CLARITY" title="Budgets" description={`Keep spending in context for ${monthLabel(month)}.`} action={<button className="button button--primary" onClick={openCreate}><Plus size={17} /> Create budget</button>} />
    <div className="budget-notice"><ShieldCheck size={17} /><span><strong>Your numbers, your boundaries.</strong> Budgets are personal tracking limits. They are never treated as a bank-set credit limit.</span></div>
    {budgets.length ? <>
      {total.length > 0 && <section className="budget-section"><div className="section-heading"><div><h2>Monthly overview</h2><p>All expense transactions, less recorded refunds</p></div><span className="section-count">{total.length} budget{total.length === 1 ? '' : 's'}</span></div><div className="budget-card-grid">{total.map(card)}</div></section>}
      {categoryBudgets.length > 0 && <section className="budget-section"><div className="section-heading"><div><h2>Category budgets</h2><p>More focus where you want it</p></div><span className="section-count">{categoryBudgets.length} category{categoryBudgets.length === 1 ? '' : ' budgets'}</span></div><div className="budget-card-grid">{categoryBudgets.map(card)}</div></section>}
    </> : <section className="empty-state panel budget-empty-large"><div className="empty-illustration"><Gauge size={25} /></div><h3>A budget that feels like yours</h3><p>Create a monthly or category limit. We’ll compare it with recorded expenses and refunds.</p><button className="button button--primary" onClick={openCreate}><Plus size={16} /> Create your first budget</button><span className="empty-footnote">You can change or remove a budget at any time.</span></section>}
    <div className="budget-policy-note"><span>How we count</span><p>Expenses count toward budgets. Refunds subtract from spending, while income and transfers between your own accounts stay out of the calculation.</p></div>
    {open && <Modal title={editing ? 'Edit budget' : 'Create a budget'} description="Set a monthly tracking target that works for you." onClose={() => { setOpen(false); setEditing(null); }}><BudgetForm initial={editing ?? undefined} month={month} onSubmit={save} onCancel={() => { setOpen(false); setEditing(null); }} busy={busy} /></Modal>}
  </div>;
}
