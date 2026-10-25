import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Budget, BudgetInput } from '../domain/types';
import { currencySymbol, parseINRAmount } from '../lib/format';
import { monthBounds } from '../domain/finance';
import { useApp } from '../lib/app-context';

export function BudgetForm({ initial, month, onSubmit, onCancel, busy }: {
  initial?: Budget;
  month: string;
  onSubmit: (value: BudgetInput) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const { data } = useApp();
  const [amount, setAmount] = useState(initial ? (initial.limit_minor / 100).toFixed(2) : '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [validation, setValidation] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limitMinor = parseINRAmount(amount);
    if (limitMinor === null) return setValidation('Enter a budget greater than zero.');
    setValidation('');
    const { start, end } = initial ? { start: initial.period_start, end: initial.period_end } : monthBounds(month);
    await onSubmit({ category_id: categoryId || null, period_start: start, period_end: end, limit_minor: limitMinor, currency: data.profile.preferred_currency });
  }

  return <form className="form-stack modal-form" onSubmit={(event) => void submit(event)}>
    <label className="field"><span>Budget type</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Overall monthly spending</option>{data.categories.filter((category) => category.slug !== 'uncategorized').map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><small>Income and transfers are not counted as spending. Refunds reduce the spent amount.</small></label>
    <label className="field"><span>Monthly budget <i>*</i></span><div className="money-input"><span>{currencySymbol(data.profile.preferred_currency)}</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label>
    <div className="budget-period-note">For <strong>{month}</strong>. This is a personal tracking budget; it does not change your card’s credit limit.</div>
    {validation && <div className="inline-error" role="alert">{validation}</div>}
    <div className="modal-actions"><button className="button button--quiet" type="button" onClick={onCancel}>Cancel</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create budget'}</button></div>
  </form>;
}
