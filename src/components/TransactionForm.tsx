import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Transaction, TransactionInput, TransactionType } from '../domain/types';
import { parseINRAmount } from '../lib/format';
import { useApp } from '../lib/app-context';

export function TransactionForm({ initial, onSubmit, onCancel, busy }: {
  initial?: Transaction;
  onSubmit: (value: TransactionInput) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const { data, setBusy, isDemo } = useApp();
  const [amount, setAmount] = useState(initial ? (initial.amount_minor / 100).toFixed(2) : '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? data.categories.find((category) => category.slug === 'uncategorized')?.id ?? '');
  const [cardId, setCardId] = useState(initial?.card_id ?? '');
  const [type, setType] = useState<TransactionType>(initial?.transaction_type ?? 'expense');
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(initial?.occurred_at.slice(0, 10) ?? localToday);
  const [channel, setChannel] = useState(initial?.spend_channel ?? 'unknown');
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  const [validation, setValidation] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseINRAmount(amount);
    if (amountMinor === null) return setValidation('Enter an amount greater than zero (up to two decimals).');
    if (!merchant.trim()) return setValidation('Merchant or description is required.');
    if (!date || Number.isNaN(Date.parse(`${date}T00:00:00`))) return setValidation('Choose a valid transaction date.');
    setValidation('');
    await onSubmit({
      card_id: cardId || null, category_id: categoryId || null, amount_minor: amountMinor,
      currency: data.profile.preferred_currency, transaction_type: type, merchant: merchant.trim(),
      description: description.trim() || null, occurred_at: `${date}T12:00:00+05:30`,
      source: initial?.source ?? 'manual', is_demo: initial?.is_demo ?? isDemo, recurring, spend_channel: channel,
    });
  }

  return (
    <form className="form-stack modal-form" onSubmit={(event) => void submit(event)}>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Amount <i>*</i></span><div className="money-input"><span>₹</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-label="Amount in rupees" /></div></label>
        <label className="field"><span>Transaction type <i>*</i></span><select value={type} onChange={(event) => setType(event.target.value as TransactionType)}><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="transfer">Transfer</option></select></label>
      </div>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Merchant or description <i>*</i></span><input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="e.g. Corner café" /></label>
        <label className="field"><span>Date <i>*</i></span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </div>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorized</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="field"><span>Card used</span><select value={cardId} onChange={(event) => setCardId(event.target.value)}><option value="">No card linked</option>{data.cards.map((card) => <option key={card.id} value={card.id}>{card.catalog.issuer_name} · {card.catalog.card_name}</option>)}</select></label>
      </div>
      <label className="field"><span>Notes <small>Optional</small></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a note for your records" /></label>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Spend channel</span><select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}><option value="unknown">Not specified</option><option value="online">Online</option><option value="offline">In person</option></select></label>
        <label className="check-field"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /><span><strong>Recurring</strong><small>Mark this transaction as repeating</small></span></label>
      </div>
      {validation && <div className="inline-error" role="alert">{validation}</div>}
      <div className="modal-actions"><button className="button button--quiet" type="button" onClick={onCancel}>Cancel</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}</button></div>
    </form>
  );
}
