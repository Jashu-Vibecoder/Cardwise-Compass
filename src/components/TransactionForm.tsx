import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Transaction, TransactionInput, TransactionType } from '../domain/types';
import { currencySymbol, parseINRAmount } from '../lib/format';
import { useApp } from '../lib/app-context';
import { saveWalletCard } from '../lib/data';
import { dateOnly, timestampAtLocalNoon } from '../domain/dates';

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
  const localToday = dateOnly(new Date().toISOString(), data.profile.timezone);
  const [date, setDate] = useState(initial ? dateOnly(initial.occurred_at, data.profile.timezone) : localToday);
  const [channel, setChannel] = useState(initial?.spend_channel ?? 'unknown');
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  const [validation, setValidation] = useState('');
  const linkedCatalogIds = new Set(data.cards.map((card) => card.catalog_card_id));
  const otherCatalogCards = data.catalog
    .filter((card) => !linkedCatalogIds.has(card.id))
    .sort((a, b) => a.issuer_name.localeCompare(b.issuer_name) || a.card_name.localeCompare(b.card_name));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseINRAmount(amount);
    if (amountMinor === null) return setValidation('Enter an amount greater than zero (up to two decimals).');
    if (!merchant.trim()) return setValidation('Merchant or description is required.');
    if (!date || Number.isNaN(Date.parse(`${date}T00:00:00`))) return setValidation('Choose a valid transaction date.');
    setValidation('');
    let selectedCardId = cardId || null;
    if (cardId.startsWith('catalog:')) {
      const catalogCard = data.catalog.find((card) => card.id === cardId.slice('catalog:'.length));
      if (!catalogCard) return setValidation('That card is no longer available. Choose another card.');
      setBusy(true);
      try {
        selectedCardId = await saveWalletCard(catalogCard, null);
      } catch (error) {
        setValidation(error instanceof Error ? error.message : 'The card could not be added to your wallet.');
        return;
      } finally {
        setBusy(false);
      }
    }
    await onSubmit({
      card_id: selectedCardId, category_id: categoryId || null, amount_minor: amountMinor,
      currency: data.profile.preferred_currency, transaction_type: type, merchant: merchant.trim(),
      description: description.trim() || null, occurred_at: timestampAtLocalNoon(date, data.profile.timezone),
      source: initial?.source ?? 'manual', is_demo: initial?.is_demo ?? isDemo, recurring, spend_channel: channel,
    });
  }

  return (
    <form className="form-stack modal-form" onSubmit={(event) => void submit(event)}>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Amount <i>*</i></span><div className="money-input"><span>{currencySymbol(data.profile.preferred_currency)}</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-label={`Amount in ${data.profile.preferred_currency}`} /></div></label>
        <label className="field"><span>Transaction type <i>*</i></span><select value={type} onChange={(event) => setType(event.target.value as TransactionType)}><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="transfer">Transfer</option></select></label>
      </div>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Merchant or description <i>*</i></span><input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="e.g. Corner café" /></label>
        <label className="field"><span>Date <i>*</i></span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </div>
      <div className="form-grid form-grid--two">
        <label className="field"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorized</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="field"><span>Card used</span><select value={cardId} onChange={(event) => setCardId(event.target.value)}><option value="">No card linked</option>{data.cards.length > 0 && <optgroup label="My cards">{data.cards.map((card) => <option key={card.id} value={card.id}>{card.catalog.issuer_name} · {card.catalog.card_name}</option>)}</optgroup>}{otherCatalogCards.length > 0 && <optgroup label="Add a card from the catalogue">{otherCatalogCards.map((card) => <option key={card.id} value={`catalog:${card.id}`}>{card.issuer_name} · {card.card_name} (add to My Cards)</option>)}</optgroup>}</select>{otherCatalogCards.length > 0 && <small>Choosing another catalogue card adds it to My Cards, then links this transaction.</small>}</label>
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
