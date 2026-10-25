import { useMemo } from 'react';
import { BadgeIndianRupee, ExternalLink, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { calculateCardRewards } from '../domain/finance';
import { formatCurrency, monthLabel } from '../lib/format';

export function RewardsPage() {
  const { data, month } = useApp();
  const currency = data.profile.preferred_currency;
  const money = (minor: number) => formatCurrency(minor, currency);
  const estimates = useMemo(() => calculateCardRewards(data.transactions, data.cards, data.rewardRules, month, data.categories, data.profile.timezone, currency), [data.transactions, data.cards, data.rewardRules, data.categories, data.profile.timezone, currency, month]);
  const available = estimates.filter((item) => item.rules.length > 0);
  const earnedMinor = available.reduce((sum, item) => sum + item.estimatedRewardMinor, 0);
  const eligibleSpendMinor = available.reduce((sum, item) => sum + item.eligibleSpendMinor, 0);
  const appliedRuleCount = new Set(available.flatMap((item) => item.rules.map(({ rule }) => rule.id))).size;

  return <div className="page-content">
    <PageHeader eyebrow="REWARD COMPASS" title="Rewards" description={`A transparent view of tracked reward estimates for ${monthLabel(month)}.`} />
    <div className="reward-trust-banner"><ShieldCheck size={18} /><span><strong>Only verified rules count.</strong> Reward estimates use saved card transactions and official issuer rules. They are not a bank statement or a promise of earnings.</span></div>
    <section className="metric-grid metric-grid--rewards">
      <article className="metric-card metric-card--primary"><div className="metric-topline"><span>Estimated rewards</span><span className="metric-icon"><BadgeIndianRupee size={17} /></span></div><strong>{available.length ? money(earnedMinor) : '—'}</strong><div className="metric-foot"><span>{available.length ? `${appliedRuleCount} verified rule${appliedRuleCount === 1 ? '' : 's'} applied` : 'No verified rules for saved cards'}</span><span>{monthLabel(month)}</span></div></article>
      <article className="metric-card"><div className="metric-topline"><span>Eligible card spend</span><span className="metric-icon metric-icon--green"><Sparkles size={17} /></span></div><strong>{available.length ? money(eligibleSpendMinor) : '—'}</strong><div className="metric-foot"><span>Transactions matched to verified rules</span><span>By selected month</span></div></article>
      <article className="metric-card"><div className="metric-topline"><span>Cards tracked</span><span className="metric-icon metric-icon--blue"><BadgeIndianRupee size={17} /></span></div><strong>{data.cards.length}</strong><div className="metric-foot"><span>{data.cards.filter((card) => card.catalog.verification_status === 'identity_verified' || card.catalog.verification_status === 'verified' || card.catalog.verification_status === 'benefits_verified').length} identities checked</span><span>Benefits can differ</span></div></article>
      <article className="metric-card"><div className="metric-topline"><span>Reward rules</span><span className="metric-icon metric-icon--amber"><Info size={17} /></span></div><strong>{appliedRuleCount}</strong><div className="metric-foot"><span>Issuer-sourced and reviewed</span><span>Matched this month</span></div></article>
    </section>

    {available.length ? <section className="panel reward-results-panel"><div className="panel-header"><div><div className="panel-title">Card estimates</div><div className="panel-subtitle">Eligible spending from saved transactions</div></div><span className="estimate-caption">ESTIMATE · {monthLabel(month).toUpperCase()}</span></div>
      {available.map((item) => <div className="reward-card-row" key={item.card.id}><div className="reward-card-brand"><span className="suggestion-bank-mark">{item.card.catalog.issuer_name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><div><strong>{item.card.catalog.card_name}</strong><span>{item.card.catalog.issuer_name}</span></div></div><div className="reward-card-rule-list">{item.rules.map((value) => <div className="reward-rule-line" key={value.rule.id}><span>{value.rule.label}</span><span>{(value.rule.rate_basis_points / 100).toFixed(value.rule.rate_basis_points % 100 ? 2 : 0)}% · {money(value.eligibleSpendMinor)} eligible</span><a href={value.rule.source_url} target="_blank" rel="noreferrer" aria-label={`Open issuer source for ${value.rule.label}`}><ExternalLink size={13} /></a></div>)}</div><div className="reward-card-total"><span>Estimated</span><strong>{money(item.estimatedRewardMinor)}</strong></div></div>)}
      <div className="reward-footnote"><Info size={14} />Rules with statement-cycle caps are held back until the card’s statement cycle is known.</div>
    </section> : <section className="empty-state panel reward-empty"><div className="reward-empty-orbit"><span><BadgeIndianRupee size={27} /></span></div><span className="eyebrow">NO VERIFIED TERMS YET</span><h2>We’ll wait for the real rules.</h2><p>Card names are checked against issuer sources, but reward rates, caps, exclusions, and fees have not been verified for your saved cards. We won’t estimate rewards from catalogue blurbs.</p><div className="reward-empty-points"><div><span className="point-check">✓</span><span>Issuer source stored with each verified rule</span></div><div><span className="point-check">✓</span><span>Caps and exclusions applied before showing estimates</span></div><div><span className="point-check">✓</span><span>Unknown card terms stay clearly marked</span></div></div></section>}
    <div className="reward-method-note"><span className="reward-method-icon"><ShieldCheck size={16} /></span><div><strong>How Cardwise estimates rewards</strong><p>We match eligible expenses to card rules with an official source, verification date, validity dates, caps, and exclusions. We do not infer rewards from card names or third-party summaries. Refunds, income, and transfers are excluded from reward estimates.</p></div></div>
  </div>;
}
