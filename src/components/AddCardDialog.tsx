import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, CircleHelp, Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { CatalogCard, WalletCard } from '../domain/types';
import { parseINRAmount, parseINRAmountOrZero } from '../lib/format';
import { saveWalletCard, searchCatalog } from '../lib/data';
import { useApp } from '../lib/app-context';
import { useToast } from '../lib/use-toast';
import { Modal } from './Modal';

function verificationLabel(status: CatalogCard['verification_status']) {
  if (status === 'verified') return 'Details verified';
  if (status === 'benefits_verified') return 'Benefits verified';
  if (status === 'identity_verified') return 'Card identity verified';
  return 'Unverified catalogue candidate';
}

function amountInput(value: number | null | undefined) {
  return value == null ? '' : (value / 100).toFixed(2);
}

export function AddCardDialog({ onClose, initialCard }: { onClose: () => void; initialCard?: WalletCard }) {
  const { data, refresh, setBusy, busy } = useApp();
  const { notify } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogCard[]>([]);
  const [selected, setSelected] = useState<CatalogCard | null>(initialCard?.catalog ?? null);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [budget, setBudget] = useState(initialCard?.monthly_budget_minor == null ? '' : (initialCard.monthly_budget_minor / 100).toFixed(2));
  const [nickname, setNickname] = useState(initialCard?.nickname ?? '');
  const [lastFour, setLastFour] = useState(initialCard?.last_four ?? '');
  const [creditLimit, setCreditLimit] = useState(amountInput(initialCard?.credit_limit_minor));
  const [statementBalance, setStatementBalance] = useState(amountInput(initialCard?.statement_balance_minor));
  const [dueDate, setDueDate] = useState(initialCard?.due_date ?? '');
  const [minimumDue, setMinimumDue] = useState(amountInput(initialCard?.minimum_due_minor));
  const [rewardPoints, setRewardPoints] = useState(initialCard?.reward_points?.toString() ?? '');
  const [personalNotes, setPersonalNotes] = useState(initialCard?.personal_notes ?? '');
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const existing = selected ? data.cards.find((card) => card.catalog_card_id === selected.id) : undefined;

  useEffect(() => {
    if (initialCard) return;
    const value = query.trim();
    if (value.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchCatalog(value, data).then(setResults).catch((issue: unknown) => {
        setResults([]);
        setError(issue instanceof Error ? issue.message : 'Card search failed. Try again.');
      }).finally(() => setSearching(false));
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query, data, initialCard]);

  function choose(card: CatalogCard) {
    setSelected(card);
    setQuery('');
    setError('');
    const saved = data.cards.find((item) => item.catalog_card_id === card.id);
    setBudget(saved?.monthly_budget_minor == null ? '' : (saved.monthly_budget_minor / 100).toFixed(2));
    setNickname(saved?.nickname ?? '');
    setLastFour(saved?.last_four ?? '');
    setCreditLimit(amountInput(saved?.credit_limit_minor));
    setStatementBalance(amountInput(saved?.statement_balance_minor));
    setDueDate(saved?.due_date ?? '');
    setMinimumDue(amountInput(saved?.minimum_due_minor));
    setRewardPoints(saved?.reward_points?.toString() ?? '');
    setPersonalNotes(saved?.personal_notes ?? '');
  }

  function keyNavigate(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(results.length - 1, index + 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
    if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); }
    if (event.key === 'Escape') { setResults([]); setActiveIndex(-1); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return setError('Choose a card from the catalogue first.');
    const budgetMinor = budget.trim() ? parseINRAmount(budget) : null;
    if (budget.trim() && budgetMinor === null) return setError('Tracking budget must be greater than zero, or leave it blank.');
    if (lastFour && !/^\d{4}$/.test(lastFour)) return setError('Enter exactly four digits, or leave this field blank.');
    const creditLimitMinor = creditLimit.trim() ? parseINRAmountOrZero(creditLimit) : null;
    if (creditLimit.trim() && (creditLimitMinor === null || creditLimitMinor === 0)) return setError('Credit limit must be greater than zero, or leave it blank.');
    const statementBalanceMinor = statementBalance.trim() ? parseINRAmountOrZero(statementBalance) : null;
    if (statementBalance.trim() && statementBalanceMinor === null) return setError('Outstanding balance must be zero or more, or leave it blank.');
    const minimumDueMinor = minimumDue.trim() ? parseINRAmountOrZero(minimumDue) : null;
    if (minimumDue.trim() && minimumDueMinor === null) return setError('Minimum due must be zero or more, or leave it blank.');
    const points = rewardPoints.trim() ? Number(rewardPoints) : null;
    if (rewardPoints.trim() && (!/^\d+$/.test(rewardPoints) || !Number.isSafeInteger(points))) return setError('Reward points must be a whole number, or leave it blank.');
    setError('');
    setBusy(true);
    try {
      await saveWalletCard(selected, budgetMinor, initialCard?.id ?? existing?.id, nickname.trim() || null, lastFour || null, {
        credit_limit_minor: creditLimitMinor,
        statement_balance_minor: statementBalanceMinor,
        due_date: dueDate || null,
        minimum_due_minor: minimumDueMinor,
        reward_points: points,
        personal_notes: personalNotes.trim() || null,
      });
      await refresh();
      notify(existing ? 'Card details updated in your wallet.' : 'Card added to your wallet.');
      onClose();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'This card could not be saved.');
    } finally { setBusy(false); }
  }

  return <Modal title={initialCard ? 'Edit saved card' : 'Add a card'} description={initialCard ? 'Update the tracking details for this card.' : 'Search the catalogue, then choose what you want to track.'} onClose={onClose} size="wide">
    <div className="add-card-body">
      {!selected ? <div className="catalog-search-area">
        <label className="field"><span>Search cards</span><div className="catalog-search-input"><Search size={18} /><input ref={searchRef} autoFocus autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); setError(''); }} onKeyDown={keyNavigate} placeholder="Search by bank or credit card name" role="combobox" aria-expanded={results.length > 0} aria-controls="catalog-suggestions" aria-autocomplete="list" /></div></label>
        {query.trim().length < 2 && <div className="search-hint"><CircleHelp size={15} /><span>Start typing a bank or card name. Suggestions appear here as you search.</span></div>}
        {searching && <div className="catalog-state"><span className="loader loader--small" />Searching the card catalogue…</div>}
        {!searching && query.trim().length >= 2 && results.length === 0 && !error && <div className="catalog-state catalog-state--empty"><Search size={20} /><strong>No matching cards</strong><span>Check the spelling or try another bank name. Card details won’t be made up.</span></div>}
        {results.length > 0 && <div className="suggestion-list" id="catalog-suggestions" role="listbox" aria-label="Card suggestions">{results.map((card, index) => <button key={card.id} role="option" aria-selected={activeIndex === index} className={`suggestion-item ${activeIndex === index ? 'suggestion-item--active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(card)}><span className={`suggestion-bank-mark suggestion-bank-mark--${index % 4}`}>{card.issuer_name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><span className="suggestion-copy"><strong>{card.card_name}</strong><span>{card.issuer_name} · {card.category || 'Category unavailable'}</span></span><span className={`tiny-status ${card.verification_status === 'identity_verified' || card.verification_status === 'verified' || card.verification_status === 'benefits_verified' ? 'tiny-status--verified' : ''}`}>{verificationLabel(card.verification_status)}</span></button>)}</div>}
        {error && <div className="inline-error" role="alert">{error}</div>}
        <div className="catalog-privacy"><ShieldCheck size={15} />Only catalogue cards are suggested. No bank page is scraped during this search.</div>
      </div> : <form className="form-stack modal-form" onSubmit={(event) => void submit(event)}>
        <div className="selected-catalog-card"><div className="selected-card-mark"><span>{selected.issuer_name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><i /></div><div className="selected-catalog-copy"><span className="eyebrow">{selected.issuer_name}</span><h3>{selected.card_name}</h3><div className="selected-status"><BadgeCheck size={15} />{verificationLabel(selected.verification_status)}</div></div>{!initialCard && <button type="button" className="text-button" onClick={() => { setSelected(null); setTimeout(() => searchRef.current?.focus(), 0); }}>Change</button>}</div>
        {selected.source_url && <a className="official-source-link" href={selected.source_url} target="_blank" rel="noreferrer">View issuer source <span aria-hidden="true">↗</span></a>}
        <div className="form-grid form-grid--two">
          <label className="field"><span>Card nickname <small>Optional</small></span><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="e.g. Everyday rewards" /></label>
          <label className="field"><span>Last four digits <small>Optional</small></span><input inputMode="numeric" maxLength={4} value={lastFour} onChange={(event) => setLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label>
        </div>
        <label className="field"><span>Monthly tracking budget <small>Optional</small></span><div className="money-input"><span>₹</span><input inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Set a personal spend target" /></div><small>A reminder limit you choose. This is not your bank’s credit limit.</small></label>
        <div className="card-statement-heading"><strong>Statement tracking</strong><span>Optional values you enter from your latest statement.</span></div>
        <div className="form-grid form-grid--two">
          <label className="field"><span>Credit limit</span><div className="money-input"><span>₹</span><input inputMode="decimal" value={creditLimit} onChange={(event) => setCreditLimit(event.target.value)} placeholder="e.g. 200000" /></div></label>
          <label className="field"><span>Current outstanding</span><div className="money-input"><span>₹</span><input inputMode="decimal" value={statementBalance} onChange={(event) => setStatementBalance(event.target.value)} placeholder="e.g. 45000" /></div></label>
          <label className="field"><span>Payment due date</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label className="field"><span>Minimum due</span><div className="money-input"><span>₹</span><input inputMode="decimal" value={minimumDue} onChange={(event) => setMinimumDue(event.target.value)} placeholder="e.g. 4500" /></div></label>
          <label className="field"><span>Reward points balance</span><input inputMode="numeric" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="e.g. 12500" /></label>
          <label className="field card-notes-field"><span>Personal notes</span><textarea maxLength={500} rows={2} value={personalNotes} onChange={(event) => setPersonalNotes(event.target.value)} placeholder="A note for yourself about this card" /></label>
        </div>
        <div className="verification-note"><Sparkles size={15} /><span>{selected.verification_status === 'identity_verified' ? 'We verified the card name from an issuer source. Reward rates, fees, and terms are not yet verified, so estimates stay off.' : selected.verification_status === 'unverified' ? 'This is an unverified catalogue candidate. Its card details and reward claims should be reviewed before relying on them.' : 'Only verified catalogue details are used for reward estimates.'}</span></div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <div className="modal-actions"><button className="button button--quiet" type="button" onClick={onClose}>Cancel</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : existing ? 'Update saved card' : 'Add to my cards'}</button></div>
      </form>}
    </div>
  </Modal>;
}
