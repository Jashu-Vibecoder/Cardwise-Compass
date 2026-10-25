import { describe, expect, it } from 'vitest';
import { budgetSpent, calculateCardRewards, calculateRewardMinor, categoryTotals, creditPosition, monthlySummary, sumTransactions } from './finance';
import { parseINRAmountOrZero } from '../lib/format';
import type { Budget, Category, Transaction } from './types';

const user = 'fixture-user';
const categories: Category[] = [
  { id: 'food', slug: 'food', name: 'Food', color: '#f69d56' },
  { id: 'travel', slug: 'travel', name: 'Travel', color: '#6aa9ea' },
];
const transactions: Transaction[] = [
  { id: 'expense-1', user_id: user, card_id: null, category_id: 'food', amount_minor: 10_000, currency: 'INR', transaction_type: 'expense', merchant: 'Market', description: null, occurred_at: '2026-10-03T12:00:00+05:30', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
  { id: 'expense-2', user_id: user, card_id: null, category_id: 'travel', amount_minor: 5_500, currency: 'INR', transaction_type: 'expense', merchant: 'Metro', description: null, occurred_at: '2026-10-14T12:00:00+05:30', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
  { id: 'expense-3', user_id: user, card_id: null, category_id: 'food', amount_minor: 1_000, currency: 'INR', transaction_type: 'expense', merchant: 'Cafe', description: null, occurred_at: '2026-10-20T12:00:00+05:30', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
  { id: 'income', user_id: user, card_id: null, category_id: null, amount_minor: 20_000, currency: 'INR', transaction_type: 'income', merchant: 'Salary', description: null, occurred_at: '2026-10-01T12:00:00+05:30', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
  { id: 'refund', user_id: user, card_id: null, category_id: 'food', amount_minor: 1_500, currency: 'INR', transaction_type: 'refund', merchant: 'Return', description: null, occurred_at: '2026-10-24T12:00:00+05:30', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
  { id: 'transfer', user_id: user, card_id: null, category_id: null, amount_minor: 9_999, currency: 'INR', transaction_type: 'transfer', merchant: 'Savings', description: null, occurred_at: '2026-10-25T12:00:00+05:30', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
  { id: 'next-month', user_id: user, card_id: null, category_id: 'food', amount_minor: 40_000, currency: 'INR', transaction_type: 'expense', merchant: 'November', description: null, occurred_at: '2026-11-01T00:00:00Z', source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown' },
];

describe('financial calculations', () => {
  it('counts expense and refund amounts, separates income, and excludes transfers', () => {
    expect(sumTransactions(transactions, '2026-10')).toEqual({
      expensesMinor: 15_000,
      incomeMinor: 20_000,
      refundsMinor: 1_500,
      netMinor: 5_000,
    });
  });

  it('uses an honest null comparison when the previous month has no data', () => {
    const summary = monthlySummary(transactions.filter((row) => row.id !== 'next-month'), '2026-10');
    expect(summary.previousExpensesMinor).toBe(0);
    expect(summary.expenseChangePercent).toBeNull();
  });

  it('limits category totals to the selected month and applies refunds', () => {
    expect(categoryTotals(transactions, '2026-10', categories)).toEqual([
      { ...categories[0], currentMinor: 9_500, percent: (9_500 / 15_000) * 100 },
      { ...categories[1], currentMinor: 5_500, percent: (5_500 / 15_000) * 100 },
    ]);
  });

  it('includes uncategorized spending in category totals', () => {
    const rows = [...transactions, {
      ...transactions[0], id: 'uncategorized-expense', category_id: null, amount_minor: 1_800,
    }];
    expect(categoryTotals(rows, '2026-10', categories)).toContainEqual({
      id: 'uncategorized', slug: 'uncategorized', name: 'Uncategorized', color: '#9aa5b5',
      currentMinor: 1_800, percent: (1_800 / 16_800) * 100,
    });
  });

  it('compares a budget against expenses less refunds only', () => {
    const budget: Budget = { id: 'b', user_id: user, category_id: null, period_start: '2026-10-01', period_end: '2026-10-31', limit_minor: 50_000, currency: 'INR', is_demo: false };
    expect(budgetSpent(transactions, budget)).toBe(15_000);
  });

  it('calculates rewards in integer paise and respects a remaining cap', () => {
    expect(calculateRewardMinor(10_001, 500)).toBe(500);
    expect(calculateRewardMinor(10_001, 500, 375)).toBe(375);
    expect(calculateRewardMinor(-1, 500)).toBe(0);
  });

  it('applies excluded reward categories stored as category slugs', () => {
    const card = {
      id: 'wallet-1', user_id: user, catalog_card_id: 'catalog-1', nickname: null,
      card_type: 'credit' as const, last_four: null, monthly_budget_minor: null,
      credit_limit_minor: null, statement_balance_minor: null, due_date: null,
      minimum_due_minor: null, reward_points: null, personal_notes: null, is_demo: false,
      catalog: { id: 'catalog-1', issuer_name: 'Bank', card_name: 'Rewards', category: null, aliases: [], official_product_url: null, source_url: null, verification_status: 'verified' as const, last_verified_at: null, benefit_summary: null, annual_fee_minor: null, joining_fee_minor: null },
    };
    const rule = {
      id: 'rule-1', catalog_card_id: 'catalog-1', label: 'Online rewards', channel: 'any' as const,
      rate_basis_points: 500, monthly_cap_minor: null, cap_period: 'none' as const,
      category_id: null, excluded_categories: ['travel'], source_url: 'https://issuer.example/rules',
      verified_at: '2026-10-01', valid_from: '2026-01-01', valid_until: null,
    };
    const rows: Transaction[] = [
      { ...transactions[0], id: 'reward-food', card_id: card.id, spend_channel: 'online' },
      { ...transactions[1], id: 'reward-travel', category_id: 'category-travel-id', card_id: card.id, spend_channel: 'online' },
    ];

    const rewardCategories: Category[] = [
      { id: 'food-id', slug: 'food', name: 'Food', color: '#f69d56' },
      { id: 'category-travel-id', slug: 'travel', name: 'Travel', color: '#6aa9ea' },
    ];
    expect(calculateCardRewards(rows, [card], [rule], '2026-10', rewardCategories)[0]).toMatchObject({
      eligibleSpendMinor: 10_000,
      estimatedRewardMinor: 500,
    });
  });

  it('calculates combined utilization only from cards with both statement values', () => {
    expect(creditPosition([
      { card_type: 'credit', credit_limit_minor: 20_000_000, statement_balance_minor: 4_500_000 },
      { card_type: 'credit', credit_limit_minor: 15_000_000, statement_balance_minor: null },
      { card_type: 'debit', credit_limit_minor: 10_000_000, statement_balance_minor: 2_000_000 },
    ])).toEqual({
      trackedCards: [{ card_type: 'credit', credit_limit_minor: 20_000_000, statement_balance_minor: 4_500_000 }],
      limitMinor: 20_000_000,
      outstandingMinor: 4_500_000,
      availableMinor: 15_500_000,
      utilizationPercent: 22.5,
    });
  });

  it('accepts zero for optional statement amounts while rejecting malformed money', () => {
    expect(parseINRAmountOrZero('0')).toBe(0);
    expect(parseINRAmountOrZero('4500.50')).toBe(450_050);
    expect(parseINRAmountOrZero('-1')).toBeNull();
    expect(parseINRAmountOrZero('1.234')).toBeNull();
  });
});
