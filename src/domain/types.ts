export type TransactionType = 'expense' | 'income' | 'refund' | 'transfer';
export type TransactionSource = 'manual' | 'csv_import' | 'android_alert' | 'bank_provider' | 'demo';
export type SpendChannel = 'online' | 'offline' | 'unknown';
export type VerificationStatus = 'unverified' | 'identity_verified' | 'benefits_verified' | 'verified';

export interface Profile {
  id: string;
  display_name: string;
  city: string | null;
  occupation: string | null;
  monthly_income_minor: number | null;
  preferred_currency: string;
  timezone: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  color: string;
}

export interface CatalogCard {
  id: string;
  issuer_name: string;
  card_name: string;
  category: string | null;
  aliases: string[];
  official_product_url: string | null;
  source_url: string | null;
  verification_status: VerificationStatus;
  last_verified_at: string | null;
  benefit_summary: string | null;
  annual_fee_minor: number | null;
  joining_fee_minor: number | null;
}

export interface WalletCard {
  id: string;
  user_id: string;
  catalog_card_id: string;
  nickname: string | null;
  card_type: 'credit' | 'debit' | 'prepaid' | 'other';
  last_four: string | null;
  monthly_budget_minor: number | null;
  credit_limit_minor: number | null;
  statement_balance_minor: number | null;
  due_date: string | null;
  minimum_due_minor: number | null;
  reward_points: number | null;
  personal_notes: string | null;
  is_demo: boolean;
  catalog: CatalogCard;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  period_start: string;
  period_end: string;
  limit_minor: number;
  currency: string;
  is_demo: boolean;
}

export interface RewardRule {
  id: string;
  catalog_card_id: string;
  label: string;
  channel: SpendChannel | 'any';
  rate_basis_points: number;
  monthly_cap_minor: number | null;
  cap_period: 'calendar_month' | 'statement_cycle' | 'none';
  qualifying_category_id: string | null;
  excluded_categories: string[];
  source_url: string;
  verified_at: string;
  valid_from: string;
  valid_until: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  card_id: string | null;
  category_id: string | null;
  amount_minor: number;
  currency: string;
  transaction_type: TransactionType;
  merchant: string;
  description: string | null;
  occurred_at: string;
  dedupe_key?: string | null;
  source: TransactionSource;
  is_demo: boolean;
  recurring: boolean;
  spend_channel: SpendChannel;
}

export interface WorkspaceData {
  profile: Profile;
  categories: Category[];
  catalog: CatalogCard[];
  cards: WalletCard[];
  budgets: Budget[];
  transactions: Transaction[];
  rewardRules: RewardRule[];
}

export interface TransactionInput {
  card_id: string | null;
  category_id: string | null;
  amount_minor: number;
  currency: string;
  transaction_type: TransactionType;
  merchant: string;
  description: string | null;
  occurred_at: string;
  source: TransactionSource;
  is_demo: boolean;
  recurring: boolean;
  spend_channel: SpendChannel;
}

export interface BudgetInput {
  category_id: string | null;
  period_start: string;
  period_end: string;
  limit_minor: number;
  currency: string;
}
