import { useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, CreditCard, Gauge, Info, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { AddCardDialog } from '../components/AddCardDialog';
import { useToast } from '../lib/use-toast';
import { formatINR, shortDate } from '../lib/format';
import { removeWalletCard } from '../lib/data';
import { creditPosition } from '../domain/finance';
import type { WalletCard } from '../domain/types';

function identityStatus(card: WalletCard) {
  const status = card.catalog.verification_status;
  if (status === 'verified' || status === 'benefits_verified') return 'Benefits verified';
  if (status === 'identity_verified') return 'Identity checked';
  return 'Unverified catalogue candidate';
}

function indiaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function daysUntil(date: string) {
  const today = indiaToday().split('-').map(Number);
  const due = date.split('-').map(Number);
  return Math.round((Date.UTC(due[0], due[1] - 1, due[2]) - Date.UTC(today[0], today[1] - 1, today[2])) / 86_400_000);
}

function dueCaption(date: string) {
  const days = daysUntil(date);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export function CardsPage() {
  const { data, refresh, setBusy } = useApp();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WalletCard | null>(null);
  const position = useMemo(() => creditPosition(data.cards), [data.cards]);
  const today = indiaToday();
  const dueCards = useMemo(() => data.cards
    .filter((card) => card.due_date && card.due_date >= today)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
  [data.cards, today]);

  async function remove(card: WalletCard) {
    if (!window.confirm(`Remove ${card.catalog.card_name} from your wallet? Linked transactions will stay, but the card association will be cleared.`)) return;
    setBusy(true);
    try {
      await removeWalletCard(card.id);
      await refresh();
      notify('Card removed from your wallet.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Card could not be removed.', 'error'); }
    finally { setBusy(false); }
  }

  return <div className="page-content">
    <PageHeader eyebrow="YOUR WALLET" title="Your credit cards" description="Track statement balances, available credit, and payment dates in one place." action={<button className="button button--primary" onClick={() => setAddOpen(true)}><Plus size={17} /> Add card</button>} />
    <div className="card-vault-note"><ShieldCheck size={18} /><span><strong>Your statement stays yours.</strong> Card limits, balances, due dates, points, and notes are entered by you. Cardwise never asks for your PIN, CVV, full card number, or bank login.</span></div>
    <div className="credit-overview-layout">
      <section className="credit-card-grid" aria-label="Saved credit cards">
        {data.cards.map((card, index) => {
          const hasUsage = card.credit_limit_minor != null && card.credit_limit_minor > 0 && card.statement_balance_minor != null;
          const utilization = hasUsage ? Math.round((card.statement_balance_minor! / card.credit_limit_minor!) * 100) : null;
          const available = hasUsage ? card.credit_limit_minor! - card.statement_balance_minor! : null;
          return <article className="credit-card-tile" key={card.id}>
            <Link className={`credit-card-visual credit-card-visual--${index % 4}`} to={`/cards/${card.id}`} aria-label={`View details for ${card.catalog.card_name}`}>
              <div className="credit-card-visual-top"><span><CreditCard size={18} />{card.catalog.issuer_name}</span><span className="credit-card-status"><BadgeCheck size={13} />Tracked</span></div>
              <div className="credit-card-visual-name"><strong>{card.nickname || card.catalog.card_name}</strong><span>•••• &nbsp;•••• &nbsp;•••• &nbsp;{card.last_four || '••••'}</span></div>
              <div className="credit-card-visual-metrics"><div><span>Credit limit</span><strong>{card.credit_limit_minor == null ? 'Not entered' : formatINR(card.credit_limit_minor)}</strong></div><div><span>Current outstanding</span><strong>{card.statement_balance_minor == null ? 'Not entered' : formatINR(card.statement_balance_minor)}</strong></div><div><span>Available</span><strong>{available == null ? '—' : formatINR(Math.max(0, available))}</strong></div></div>
              <span className="credit-card-orbit credit-card-orbit--one" /><span className="credit-card-orbit credit-card-orbit--two" />
            </Link>
            <div className="credit-card-tile-footer">
              <div className="credit-card-utilization"><div><span>Credit utilization</span><strong>{utilization == null ? 'Add statement details' : `${utilization}%`}</strong></div><div className="utilization-track"><span style={{ width: `${Math.min(100, Math.max(0, utilization ?? 0))}%` }} /></div></div>
              <div className="credit-card-tile-actions"><span className="verify-pill verify-pill--good"><BadgeCheck size={13} />{identityStatus(card)}</span><div className="row-actions"><button className="icon-button" onClick={() => setEditing(card)} aria-label={`Edit ${card.catalog.card_name}`} title="Edit statement details"><CreditCard size={15} /></button><button className="icon-button icon-button--danger" onClick={() => void remove(card)} aria-label={`Remove ${card.catalog.card_name}`} title="Remove card"><Trash2 size={15} /></button></div></div>
            </div>
          </article>;
        })}
        <button className="wallet-add-tile" onClick={() => setAddOpen(true)}><span className="add-tile-icon"><Plus size={19} /></span><strong>Add another card</strong><span>Find a card by bank or name</span></button>
      </section>

      <aside className="credit-overview-aside">
        <section className="panel credit-position-panel">
          <div className="panel-header"><div className="panel-title-with-icon"><span className="credit-panel-icon"><Gauge size={16} /></span><span>Overall utilization</span></div><span className="credit-panel-caption">Entered statement data</span></div>
          {position.utilizationPercent == null ? <div className="credit-empty-note"><Info size={16} /><span>Add a credit limit and current outstanding to see your combined utilization.</span></div> : <>
            <div className="credit-position-value"><strong>{position.utilizationPercent.toFixed(1)}%</strong><span>{formatINR(position.outstandingMinor)} used of {formatINR(position.limitMinor)}</span></div>
            <div className="utilization-track utilization-track--large"><span style={{ width: `${Math.min(100, Math.max(0, position.utilizationPercent))}%` }} /></div>
            <div className="credit-position-foot"><span>{position.trackedCards.length} card{position.trackedCards.length === 1 ? '' : 's'} with complete statement details</span><strong>{formatINR(Math.max(0, position.availableMinor))} available</strong></div>
          </>}
          <div className="credit-score-note"><ShieldCheck size={15} /><span>Cardwise tracks values you enter. It does not retrieve or estimate a credit bureau score.</span></div>
        </section>

        <section className="panel upcoming-dues-panel">
          <div className="panel-header"><div className="panel-title-with-icon"><span className="due-panel-icon"><CalendarDays size={16} /></span><span>Upcoming payment dates</span></div><span className="credit-panel-caption">From your statements</span></div>
          {dueCards.length ? <div className="upcoming-due-list">{dueCards.map((card) => <Link className="upcoming-due-item" key={card.id} to={`/cards/${card.id}`}>
            <span className={`upcoming-due-mark upcoming-due-mark--${data.cards.indexOf(card) % 4}`}>{card.catalog.issuer_name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span>
            <span className="upcoming-due-copy"><strong>{card.catalog.issuer_name}</strong><span>{card.nickname || card.catalog.card_name}</span><small>{shortDate(card.due_date!)}</small></span>
            <span className="upcoming-due-amount"><strong>{card.minimum_due_minor == null ? '—' : formatINR(card.minimum_due_minor)}</strong><span>{dueCaption(card.due_date!)}</span></span>
          </Link>)}</div> : <div className="credit-empty-note"><CalendarDays size={16} /><span>No future payment dates entered yet. Add a date from your latest statement.</span></div>}
        </section>
        <div className="card-vault-footer"><Info size={15} /><span>Outstanding balances and payment dates are not inferred from transactions.</span></div>
      </aside>
    </div>
    {addOpen && <AddCardDialog onClose={() => setAddOpen(false)} />}
    {editing && <AddCardDialog initialCard={editing} onClose={() => setEditing(null)} />}
  </div>;
}
