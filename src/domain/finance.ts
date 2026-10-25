import type { Budget, Category, RewardRule, Transaction, TransactionType, WalletCard } from './types';

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

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function sumTransactions(transactions: Transaction[], month: string) {
  const rows = transactions.filter((item) => monthKey(item.occurred_at) === month);
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

export function monthlySummary(transactions: Transaction[], month: string): MonthSummary {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
  const current = sumTransactions(transactions, month);
  const previousExpensesMinor = sumTransactions(transactions, previous).expensesMinor;
  const expenseChangeMinor = current.expensesMinor - previousExpensesMinor;
  const expenseChangePercent = previousExpensesMinor === 0
    ? null
    : (expenseChangeMinor / previousExpensesMinor) * 100;

  return { ...current, previousExpensesMinor, expenseChangeMinor, expenseChangePercent };
}

export function budgetSpent(transactions: Transaction[], budget: Budget) {
  return transactions
    .filter((item) => {
      const date = item.occurred_at.slice(0, 10);
      const inRange = date >= budget.period_start && date <= budget.period_end;
      const categoryMatches = budget.category_id === null || item.category_id === budget.category_id;
      return inRange && categoryMatches && (item.transaction_type === 'expense' || item.transaction_type === 'refund');
    })
    .reduce((sum, item) => sum + (item.transaction_type === 'refund' ? -item.amount_minor : item.amount_minor), 0);
}

export function categoryTotals(transactions: Transaction[], month: string, categories: Category[]) {
  const rows = transactions.filter((item) => monthKey(item.occurred_at) === month);
  const total = sumTransactions(rows, month).expensesMinor;
  const result = categories.map((category) => {
    const current = rows
      .filter((item) => item.category_id === category.id && item.transaction_type === 'expense')
      .reduce((sum, item) => sum + item.amount_minor, 0)
      - rows
        .filter((item) => item.category_id === category.id && item.transaction_type === 'refund')
        .reduce((sum, item) => sum + item.amount_minor, 0);
    return { ...category, currentMinor: Math.max(0, current), percent: total > 0 ? (current / total) * 100 : 0 };
  });
  return result.filter((item) => item.currentMinor > 0).sort((a, b) => b.currentMinor - a.currentMinor);
}

export function categoryComparison(transactions: Transaction[], month: string, categories: Category[]) {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
  const thisMonth = categoryTotals(transactions, month, categories);
  const lastMonth = categoryTotals(transactions, previous, categories);
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

export function calculateCardRewards(transactions: Transaction[], cards: WalletCard[], rules: RewardRule[], month: string) {
  return cards.map((card) => {
    const cardRules = rules.filter((rule) => rule.catalog_card_id === card.catalog_card_id && rule.verified_at && rule.cap_period !== 'statement_cycle');
    const estimates = cardRules.map((rule) => {
      const qualifying = transactions.filter((transaction) => {
        const date = transaction.occurred_at.slice(0, 10);
        return transaction.card_id === card.id
          && transaction.transaction_type === 'expense'
          && monthKey(date) === month
          && date >= rule.valid_from
          && (!rule.valid_until || date <= rule.valid_until)
          && (rule.channel === 'any' || rule.channel === transaction.spend_channel)
          && (!rule.category_id || rule.category_id === transaction.category_id)
          && !rule.excluded_categories.includes(transaction.category_id ?? '');
      });
      const eligibleSpendMinor = qualifying.reduce((sum, row) => sum + row.amount_minor, 0);
      const rawRewardMinor = qualifying.reduce((sum, row) => sum + calculateRewardMinor(row.amount_minor, rule.rate_basis_points), 0);
      const estimatedRewardMinor = rule.monthly_cap_minor == null ? rawRewardMinor : Math.min(rawRewardMinor, rule.monthly_cap_minor);
      return { rule, eligibleSpendMinor, estimatedRewardMinor };
    });
    return {
      card,
      eligibleSpendMinor: estimates.reduce((sum, row) => sum + row.eligibleSpendMinor, 0),
      estimatedRewardMinor: estimates.reduce((sum, row) => sum + row.estimatedRewardMinor, 0),
      rules: estimates,
    };
  });
}

export function totalByType(transactions: Transaction[], month: string, type: TransactionType) {
  return transactions
    .filter((item) => monthKey(item.occurred_at) === month && item.transaction_type === type)
    .reduce((sum, item) => sum + item.amount_minor, 0);
}
