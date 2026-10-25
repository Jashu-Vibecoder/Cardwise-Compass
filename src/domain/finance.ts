import type { Budget, Category, RewardRule, Transaction, TransactionType, WalletCard } from './types';
import { dateOnly } from './dates';

export interface MonthSummary {
  expensesMinor: number;
  incomeMinor: number;
  refundsMinor: number;
  netMinor: number;
  previousExpensesMinor: number;
  expenseChangeMinor: number;
  expenseChangePercent: number | null;
}

export function creditPosition(cards: Pick<WalletCard, 'card_type' | 'credit_limit_minor' | 'statement_balance_minor'>[]) {
  const trackedCards = cards.filter((card) => card.card_type === 'credit'
    && card.credit_limit_minor !== null && card.credit_limit_minor > 0
    && card.statement_balance_minor !== null);
  const limitMinor = trackedCards.reduce((sum, card) => sum + (card.credit_limit_minor ?? 0), 0);
  const outstandingMinor = trackedCards.reduce((sum, card) => sum + (card.statement_balance_minor ?? 0), 0);
  return {
    trackedCards,
    limitMinor,
    outstandingMinor,
    availableMinor: limitMinor - outstandingMinor,
    utilizationPercent: limitMinor > 0 ? (outstandingMinor / limitMinor) * 100 : null,
  };
}

export function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = `${month}-01`;
  const next = new Date(Date.UTC(year, monthNumber, 1));
  const end = new Date(next.getTime() - 86_400_000).toISOString().slice(0, 10);
  return { start, end };
}

export function monthKey(date: string, timezone = 'UTC') {
  return dateOnly(date, timezone).slice(0, 7);
}

export function sumTransactions(transactions: Transaction[], month: string, timezone = 'UTC', currency?: string) {
  const rows = transactions.filter((item) => monthKey(item.occurred_at, timezone) === month && (!currency || item.currency === currency));
  const grossExpensesMinor = rows
    .filter((item) => item.transaction_type === 'expense')
    .reduce((sum, item) => sum + item.amount_minor, 0);
  const refundsMinor = rows
    .filter((item) => item.transaction_type === 'refund')
    .reduce((sum, item) => sum + item.amount_minor, 0);
  const incomeMinor = rows
    .filter((item) => item.transaction_type === 'income')
    .reduce((sum, item) => sum + item.amount_minor, 0);
  const expensesMinor = grossExpensesMinor - refundsMinor;
  const netMinor = incomeMinor - expensesMinor;
  return { expensesMinor, incomeMinor, refundsMinor, netMinor };
}

export function monthlySummary(transactions: Transaction[], month: string, timezone = 'UTC', currency?: string): MonthSummary {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
  const current = sumTransactions(transactions, month, timezone, currency);
  const previousExpensesMinor = sumTransactions(transactions, previous, timezone, currency).expensesMinor;
  const expenseChangeMinor = current.expensesMinor - previousExpensesMinor;
  const expenseChangePercent = previousExpensesMinor === 0
    ? null
    : (expenseChangeMinor / previousExpensesMinor) * 100;

  return { ...current, previousExpensesMinor, expenseChangeMinor, expenseChangePercent };
}

export function budgetSpent(transactions: Transaction[], budget: Budget, timezone = 'UTC') {
  return transactions
    .filter((item) => {
      const date = dateOnly(item.occurred_at, timezone);
      const inRange = date >= budget.period_start && date <= budget.period_end;
      const categoryMatches = budget.category_id === null || item.category_id === budget.category_id;
      return inRange && item.currency === budget.currency && categoryMatches && (item.transaction_type === 'expense' || item.transaction_type === 'refund');
    })
    .reduce((sum, item) => sum + (item.transaction_type === 'refund' ? -item.amount_minor : item.amount_minor), 0);
}

export function categoryTotals(transactions: Transaction[], month: string, categories: Category[], timezone = 'UTC', currency?: string) {
  const rows = transactions.filter((item) => monthKey(item.occurred_at, timezone) === month && (!currency || item.currency === currency));
  const total = sumTransactions(rows, month, timezone, currency).expensesMinor;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const currentFor = (categoryId: string | null) => rows
    .filter((item) => item.category_id === categoryId && (item.transaction_type === 'expense' || item.transaction_type === 'refund'))
    .reduce((sum, item) => sum + (item.transaction_type === 'refund' ? -item.amount_minor : item.amount_minor), 0);
  const result = categories.filter((category) => category.slug !== 'uncategorized').map((category) => {
    const current = currentFor(category.id);
    return { ...category, currentMinor: Math.max(0, current), percent: total > 0 ? (Math.max(0, current) / total) * 100 : 0 };
  });
  const uncategorized = categories.find((category) => category.slug === 'uncategorized')
    ?? { id: 'uncategorized', slug: 'uncategorized', name: 'Uncategorized', color: '#9aa5b5' };
  const uncategorizedMinor = rows
    .filter((item) => !item.category_id || categoryById.get(item.category_id)?.slug === 'uncategorized' || !categoryById.has(item.category_id))
    .filter((item) => item.transaction_type === 'expense' || item.transaction_type === 'refund')
    .reduce((sum, item) => sum + (item.transaction_type === 'refund' ? -item.amount_minor : item.amount_minor), 0);
  result.push({ ...uncategorized, currentMinor: Math.max(0, uncategorizedMinor), percent: total > 0 ? (Math.max(0, uncategorizedMinor) / total) * 100 : 0 });
  return result.filter((item) => item.currentMinor > 0).sort((a, b) => b.currentMinor - a.currentMinor);
}

export function categoryComparison(transactions: Transaction[], month: string, categories: Category[], timezone = 'UTC', currency?: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
  const thisMonth = categoryTotals(transactions, month, categories, timezone, currency);
  const lastMonth = categoryTotals(transactions, previous, categories, timezone, currency);
  const valueFor = (rows: ReturnType<typeof categoryTotals>, id: string) => rows.find((row) => row.id === id)?.currentMinor ?? 0;
  return categories
    .map((category) => ({
      ...category,
      currentMinor: valueFor(thisMonth, category.id),
      previousMinor: valueFor(lastMonth, category.id),
      changeMinor: valueFor(thisMonth, category.id) - valueFor(lastMonth, category.id),
    }))
    .sort((a, b) => b.changeMinor - a.changeMinor);
}

export function calculateRewardMinor(amountMinor: number, rateBasisPoints: number, remainingCapMinor?: number | null) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !Number.isSafeInteger(rateBasisPoints) || rateBasisPoints < 0) return 0;
  const raw = Math.floor((amountMinor * rateBasisPoints) / 10_000);
  return remainingCapMinor == null ? raw : Math.max(0, Math.min(raw, remainingCapMinor));
}

export function calculateCardRewards(transactions: Transaction[], cards: WalletCard[], rules: RewardRule[], month: string, categories: Category[] = [], timezone = 'UTC', currency?: string) {
  const categorySlugs = new Map(categories.map((category) => [category.id, category.slug]));
  return cards.map((card) => {
    // Stable tie-break: highest rate wins; equal rates use the lexically smallest rule ID.
    const cardRules = rules
      .filter((rule) => rule.catalog_card_id === card.catalog_card_id && rule.verified_at && rule.cap_period !== 'statement_cycle')
      .sort((a, b) => b.rate_basis_points - a.rate_basis_points || a.id.localeCompare(b.id));
    const allocated = new Map(cardRules.map((rule) => [rule.id, [] as Transaction[]]));
    const cardTransactions = transactions.filter((transaction) => {
      const date = dateOnly(transaction.occurred_at, timezone);
      return transaction.card_id === card.id
        && transaction.transaction_type === 'expense'
        && (!currency || transaction.currency === currency)
        && monthKey(date, timezone) === month;
    });
    for (const transaction of cardTransactions) {
      const date = dateOnly(transaction.occurred_at, timezone);
      const categorySlug = categorySlugs.get(transaction.category_id ?? '') ?? '';
      const winner = cardRules.find((rule) => date >= rule.valid_from
        && (!rule.valid_until || date <= rule.valid_until)
        && (rule.channel === 'any' || rule.channel === transaction.spend_channel)
        && (!rule.qualifying_category_id || rule.qualifying_category_id === transaction.category_id)
        && !rule.excluded_categories.includes(categorySlug));
      if (winner) allocated.get(winner.id)?.push(transaction);
    }
    const estimates = cardRules.flatMap((rule) => {
      const qualifying = allocated.get(rule.id) ?? [];
      if (qualifying.length === 0) return [];
      const eligibleSpendMinor = qualifying.reduce((sum, row) => sum + row.amount_minor, 0);
      const rawRewardMinor = qualifying.reduce((sum, row) => sum + calculateRewardMinor(row.amount_minor, rule.rate_basis_points), 0);
      const estimatedRewardMinor = rule.monthly_cap_minor == null ? rawRewardMinor : Math.min(rawRewardMinor, rule.monthly_cap_minor);
      return [{ rule, eligibleSpendMinor, estimatedRewardMinor }];
    });
    return {
      card,
      eligibleSpendMinor: estimates.reduce((sum, row) => sum + row.eligibleSpendMinor, 0),
      estimatedRewardMinor: estimates.reduce((sum, row) => sum + row.estimatedRewardMinor, 0),
      rules: estimates,
    };
  });
}

export function totalByType(transactions: Transaction[], month: string, type: TransactionType, timezone = 'UTC', currency?: string) {
  return transactions
    .filter((item) => monthKey(item.occurred_at, timezone) === month && item.transaction_type === type && (!currency || item.currency === currency))
    .reduce((sum, item) => sum + item.amount_minor, 0);
}
