import { useState } from 'react';
import { BadgeIndianRupee, BadgeCheck, CalendarDays, ChevronLeft, CreditCard, FileText, Gauge, Info, Pencil, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AddCardDialog } from '../components/AddCardDialog';
import { useApp } from '../lib/app-context';
import { formatINR } from '../lib/format';
import type { WalletCard } from '../domain/types';

function longDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
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

function dueStatus(date: string) {
  const days = daysUntil(date);
  if (days < 0) return 'Date has passed';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

function utilization(card: WalletCard) {
  if (card.credit_limit_minor == null || card.credit_limit_minor <= 0 || card.statement_balance_minor == null) return null;
  return (card.statement_balance_minor / card.credit_limit_minor) * 100;
}

export function CardDetailsPage() {
  const { cardId } = useParams();
  const { data } = useApp();
  const [editing, setEditing] = useState(false);
  const card = data.cards.find((item) => item.id === cardId);
  if (!card) return <div className="page-content"><Link className="back-link" to="/cards"><ChevronLeft size={16} /> Back to My Cards</Link><section className="panel card-not-found"><h1>Card not found</h1><p>This card may have been removed from your wallet.</p><Link className="button button--primary" to="/cards">Return to My Cards</Link></section></div>;

  const percent = utilization(card);
  const available = card.credit_limit_minor != null && card.statement_balance_minor != null
    ? card.credit_limit_minor - card.statement_balance_minor
    : null;
  const verifiedRules = data.rewardRules.filter((rule) => rule.catalog_card_id === card.catalog_card_id);

  return <div className="page-content card-detail-page">
    <Link className="back-link" to="/cards"><ChevronLeft size={16} /> Back to My Cards</Link>
    <section className="card-detail-hero">
      <div className="card-detail-hero-top"><span><CreditCard size={19} />{card.catalog.issuer_name}</span><span className="card-detail-tracked"><BadgeCheck size={14} />{card.catalog.verification_status === 'identity_verified' || card.catalog.verification_status === 'verified' || card.catalog.verification_status === 'benefits_verified' ? 'Identity checked' : 'Catalogue candidate'}</span></div>
      <h1>{card.catalog.card_name}</h1>
      {card.nickname && <p className="card-detail-nickname">{card.nickname}</p>}
      <div className="card-detail-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;{card.last_four || '••••'}</div>
      <div className="card-detail-metrics">
        <div><span>Credit limit</span><strong>{card.credit_limit_minor == null ? 'Not entered' : formatINR(card.credit_limit_minor)}</strong></div>
        <div><span>Used amount</span><strong>{card.statement_balance_minor == null ? 'Not entered' : formatINR(card.statement_balance_minor)}</strong></div>
        <div><span>Available</span><strong>{available == null ? 'Not entered' : formatINR(Math.max(0, available))}</strong></div>
      </div>
      <button className="card-detail-edit button button--light" onClick={() => setEditing(true)}><Pencil size={15} /> Edit card details</button>
      <span className="card-detail-orbit card-detail-orbit--one" /><span className="card-detail-orbit card-detail-orbit--two" />
    </section>

    <div className="card-detail-grid">
      <section className="panel card-detail-panel">
        <div className="panel-title-with-icon"><span className="detail-icon detail-icon--violet"><Gauge size={17} /></span><span>Credit utilization</span></div>
        {percent == null ? <div className="card-detail-empty"><Info size={16} /><span>Enter the credit limit and outstanding balance from your latest statement.</span></div> : <>
          <div className="detail-utilization-value"><span>Current usage</span><strong>{percent.toFixed(1)}%</strong></div>
          <div className="utilization-track utilization-track--detail" role="progressbar" aria-label="Credit utilization" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>
          <p className="card-detail-help">{formatINR(card.statement_balance_minor!)} entered as outstanding against {formatINR(card.credit_limit_minor!)} entered as the credit limit.</p>
        </>}
        <div className="card-detail-note"><ShieldCheck size={15} /><span>Calculated from your entries. Cardwise does not receive statement data from your bank.</span></div>
      </section>

      <section className="panel card-detail-panel">
        <div className="panel-title-with-icon"><span className="detail-icon detail-icon--violet"><CalendarDays size={17} /></span><span>Payment due</span></div>
        {card.due_date ? <div className="due-date-card"><div><span>Due date</span><strong>{longDate(card.due_date)}</strong></div><span className={`due-date-count ${daysUntil(card.due_date) < 6 ? 'due-date-count--soon' : ''}`}>{dueStatus(card.due_date)}</span></div> : <div className="card-detail-empty"><CalendarDays size={16} /><span>Add a due date from your latest statement to track it here.</span></div>}
        <div className="due-amount-grid"><div><span>Minimum due</span><strong>{card.minimum_due_minor == null ? 'Not entered' : formatINR(card.minimum_due_minor)}</strong></div><div><span>Total outstanding</span><strong>{card.statement_balance_minor == null ? 'Not entered' : formatINR(card.statement_balance_minor)}</strong></div></div>
        {card.due_date && daysUntil(card.due_date) < 0 && <p className="card-detail-help">This entered date has passed. Confirm the current status with your issuer or update the statement date.</p>}
      </section>

      <section className="panel card-detail-panel">
        <div className="panel-title-with-icon"><span className="detail-icon detail-icon--amber"><BadgeIndianRupee size={17} /></span><span>Rewards &amp; benefits</span></div>
        <div className="points-card"><div className="points-star"><BadgeIndianRupee size={19} /></div><div><span>Reward points balance</span><strong>{card.reward_points == null ? 'Not entered' : new Intl.NumberFormat('en-IN').format(card.reward_points)}</strong></div><small>Points</small></div>
        <div className="card-detail-note"><Info size={15} /><span>{verifiedRules.length ? `${verifiedRules.length} verified reward rule${verifiedRules.length === 1 ? '' : 's'} available. Reward value is not converted from points.` : 'Reward rates and point values are not verified for this card yet, so no cash estimate is shown.'}</span></div>
        {card.catalog.source_url && <a className="official-source-link" href={card.catalog.source_url} target="_blank" rel="noreferrer">View issuer source <span aria-hidden="true">↗</span></a>}
      </section>

      <section className="panel card-detail-panel">
        <div className="panel-title-with-icon"><span className="detail-icon detail-icon--blue"><FileText size={17} /></span><span>Personal notes</span></div>
        {card.personal_notes ? <p className="personal-card-note">{card.personal_notes}</p> : <div className="card-detail-empty"><Info size={16} /><span>Add a private reminder for yourself in card details.</span></div>}
        <div className="card-detail-note"><Info size={15} /><span>Notes stay with this saved card in your Cardwise workspace.</span></div>
      </section>

      <section className="credit-score-note credit-score-note--wide"><ShieldCheck size={16} /><span>Cardwise does not retrieve, predict, or display CIBIL or other bureau scores.</span></section>
    </div>
    {editing && <AddCardDialog initialCard={card} onClose={() => setEditing(false)} />}
  </div>;
}
