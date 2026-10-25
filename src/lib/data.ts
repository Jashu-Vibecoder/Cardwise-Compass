import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import type {
  Budget,
  BudgetInput,
  CatalogCard,
  Category,
  Profile,
  RewardRule,
  Transaction,
  TransactionInput,
  WalletCard,
  WorkspaceData,
} from '../domain/types';
import { isPublicDemoLocation, PREVIEW_STORAGE_KEY, PUBLIC_DEMO_STORAGE_KEY, usesLocalWorkspace, workspaceStorageKey } from '../domain/workspace-mode';
import { fetchAllPages } from '../domain/pagination';
import { searchCatalogRecords } from '../domain/catalog-search';
import { readFunctionErrorMessage } from './function-errors';
import { findWalletCardToUpdate } from '../domain/wallet-cards';
import { hasBudgetConflict } from '../domain/budgets';
import { clearRemovedCardLinks } from '../domain/wallet-cards-links';
import { requestPasswordReset as sendPasswordReset, updateRecoveredPassword } from './password-recovery';
import { transactionDedupeKey } from '../domain/transaction-dedupe';

const PREVIEW_KEY = PREVIEW_STORAGE_KEY;
const PREVIEW_USER = 'preview-aarav-mehta';

const categories: Category[] = [
  { id: 'cat-housing', slug: 'housing', name: 'Housing', color: '#8f7ee8' },
  { id: 'cat-groceries', slug: 'groceries', name: 'Groceries', color: '#38a88b' },
  { id: 'cat-dining', slug: 'dining', name: 'Food & dining', color: '#f69d56' },
  { id: 'cat-transport', slug: 'transport', name: 'Transport', color: '#6aa9ea' },
  { id: 'cat-utilities', slug: 'utilities', name: 'Utilities', color: '#edba4d' },
  { id: 'cat-shopping', slug: 'shopping', name: 'Shopping', color: '#dc7c9b' },
  { id: 'cat-health', slug: 'health', name: 'Health', color: '#55aeaa' },
  { id: 'cat-subscriptions', slug: 'subscriptions', name: 'Subscriptions', color: '#7784a0' },
  { id: 'cat-education', slug: 'education', name: 'Education', color: '#68927f' },
  { id: 'cat-uncategorized', slug: 'uncategorized', name: 'Uncategorized', color: '#9aa5b5' },
];

const catalog: CatalogCard[] = [
  {
    id: 'catalog-hdfc-millennia', issuer_name: 'HDFC Bank', card_name: 'Millennia', category: 'Cashback & Shopping', aliases: ['Millennia Credit Card'],
    official_product_url: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/millennia-credit-card',
    source_url: 'https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/ef2bb403-39aa-46ae-aa45-bcd1ac8a538b',
    verification_status: 'identity_verified', last_verified_at: '2026-10-25', benefit_summary: null, annual_fee_minor: null, joining_fee_minor: null,
  },
  {
    id: 'catalog-sbi-cashback', issuer_name: 'SBI Card', card_name: 'Cashback SBI Card', category: 'Cashback & Shopping', aliases: ['CASHBACK SBI Card'],
    official_product_url: 'https://www.sbicard.com/en/personal/credit-cards/cashback-sbi-card.html',
    source_url: 'https://www.sbicard.com/en/personal/credit-cards/cashback-sbi-card.html',
    verification_status: 'identity_verified', last_verified_at: '2026-10-25', benefit_summary: null, annual_fee_minor: null, joining_fee_minor: null,
  },
  {
    id: 'catalog-axis-ace', issuer_name: 'Axis Bank', card_name: 'ACE Credit Card', category: 'Cashback & Utility', aliases: ['Axis ACE'],
    official_product_url: 'https://www.axis.bank.in/cards/credit-card/axis-bank-ace-credit-card',
    source_url: 'https://www.axis.bank.in/cards/credit-card/axis-bank-ace-credit-card',
    verification_status: 'identity_verified', last_verified_at: '2026-10-25', benefit_summary: null, annual_fee_minor: null, joining_fee_minor: null,
  },
  {
    id: 'catalog-icici-amazon-pay', issuer_name: 'ICICI Bank', card_name: 'Amazon Pay ICICI Bank Credit Card', category: 'Cashback & Shopping', aliases: ['Amazon Pay ICICI'],
    official_product_url: 'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card',
    source_url: 'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card.html',
    verification_status: 'identity_verified', last_verified_at: '2026-10-25', benefit_summary: null, annual_fee_minor: null, joining_fee_minor: null,
  },
];

const profile: Profile = {
  id: PREVIEW_USER,
  display_name: 'Mira Nair',
  city: 'Bengaluru',
  occupation: 'Product designer · Salaried',
  monthly_income_minor: 7_500_000,
  preferred_currency: 'INR',
  timezone: 'Asia/Kolkata',
};

function item(id: string, date: string, amount: number, merchant: string, description: string, categoryId: string, cardId: string, type: Transaction['transaction_type'] = 'expense'): Transaction {
  return {
    id, user_id: PREVIEW_USER, card_id: cardId, category_id: categoryId, amount_minor: amount,
    currency: 'INR', transaction_type: type, merchant, description, occurred_at: `${date}T12:00:00+05:30`,
    source: 'demo', is_demo: true, recurring: false, spend_channel: 'unknown',
  };
}

function defaultPreview(): WorkspaceData {
  const previewBalances = [
    { credit_limit_minor: 20_000_000, statement_balance_minor: 4_500_000, due_date: '2026-11-15', minimum_due_minor: 450_000, reward_points: 12_500, personal_notes: 'Useful for online shopping and everyday rewards.' },
    { credit_limit_minor: 15_000_000, statement_balance_minor: 8_200_000, due_date: '2026-11-10', minimum_due_minor: 820_000, reward_points: 4_200, personal_notes: 'Use for household and grocery purchases.' },
    { credit_limit_minor: 10_000_000, statement_balance_minor: 1_500_000, due_date: '2026-11-22', minimum_due_minor: 150_000, reward_points: 3_800, personal_notes: 'Keep for utility payments.' },
    { credit_limit_minor: 25_000_000, statement_balance_minor: 12_000_000, due_date: '2026-11-08', minimum_due_minor: 1_200_000, reward_points: 9_000, personal_notes: 'Work and travel purchases.' },
  ];
  const cards: WalletCard[] = catalog.map((card, index) => ({
    id: `wallet-${card.id}`, user_id: PREVIEW_USER, catalog_card_id: card.id,
    nickname: index === 0 ? 'Everyday rewards' : null, card_type: 'credit', last_four: ['4521', '8734', '2156', '9087'][index],
    monthly_budget_minor: [9_100_000, 5_000_000, 3_500_000, 4_000_000][index],
    ...previewBalances[index], is_demo: true, catalog: card,
  }));
  const transactions: Transaction[] = [
    item('demo-oct-salary', '2026-10-01', 7_500_000, 'Studio North', 'October salary', 'cat-uncategorized', cards[0].id, 'income'),
    item('demo-oct-rent', '2026-10-02', 2_400_000, 'Lakeview Homes', 'October rent', 'cat-housing', cards[0].id),
    item('demo-oct-market-1', '2026-10-03', 218_000, 'Namdhari Fresh', 'Weekly groceries', 'cat-groceries', cards[1].id),
    item('demo-oct-coffee', '2026-10-04', 34_500, 'Third Wave Coffee', 'Coffee with a friend', 'cat-dining', cards[2].id),
    item('demo-oct-metro', '2026-10-05', 49_000, 'Namma Metro', 'Metro commute', 'cat-transport', cards[1].id),
    item('demo-oct-power', '2026-10-07', 116_000, 'BESCOM', 'Electricity bill', 'cat-utilities', cards[0].id),
    item('demo-oct-shopping', '2026-10-09', 624_000, 'Croma', 'Home office headphones', 'cat-shopping', cards[3].id),
    item('demo-oct-food', '2026-10-10', 286_000, 'Swiggy', 'Dinner delivery', 'cat-dining', cards[2].id),
    item('demo-oct-grocery-2', '2026-10-12', 302_000, 'BigBasket', 'Household staples', 'cat-groceries', cards[1].id),
    item('demo-oct-health', '2026-10-14', 120_000, 'Apollo Pharmacy', 'Health essentials', 'cat-health', cards[0].id),
    item('demo-oct-transport-2', '2026-10-16', 161_000, 'Ola', 'Airport ride', 'cat-transport', cards[2].id),
    item('demo-oct-subscription', '2026-10-17', 69_900, 'Spotify', 'Monthly subscription', 'cat-subscriptions', cards[0].id),
    item('demo-oct-course', '2026-10-18', 250_000, 'Coursera', 'Design course', 'cat-education', cards[3].id),
    item('demo-oct-shopping-2', '2026-10-20', 216_000, 'Myntra', 'Workwear', 'cat-shopping', cards[3].id),
    item('demo-oct-food-2', '2026-10-22', 145_000, 'Taaza Thindi', 'Breakfast out', 'cat-dining', cards[2].id),
    item('demo-sep-salary', '2026-09-01', 7_500_000, 'Studio North', 'September salary', 'cat-uncategorized', cards[0].id, 'income'),
    item('demo-sep-rent', '2026-09-02', 2_400_000, 'Lakeview Homes', 'September rent', 'cat-housing', cards[0].id),
    item('demo-sep-grocery', '2026-09-05', 480_000, 'Namdhari Fresh', 'Groceries', 'cat-groceries', cards[1].id),
    item('demo-sep-dining', '2026-09-08', 320_000, 'Swiggy', 'Food delivery', 'cat-dining', cards[2].id),
    item('demo-sep-metro', '2026-09-11', 190_000, 'Namma Metro', 'Commute', 'cat-transport', cards[1].id),
    item('demo-sep-utilities', '2026-09-12', 290_000, 'BESCOM', 'Utilities', 'cat-utilities', cards[0].id),
    item('demo-sep-shopping', '2026-09-16', 400_000, 'Myntra', 'Shopping', 'cat-shopping', cards[3].id),
    item('demo-sep-health', '2026-09-20', 90_000, 'Apollo Pharmacy', 'Health essentials', 'cat-health', cards[0].id),
    item('demo-sep-sub', '2026-09-21', 70_000, 'Spotify', 'Monthly subscription', 'cat-subscriptions', cards[0].id),
  ];
  const budgets: Budget[] = [
    { id: 'budget-total-oct', user_id: PREVIEW_USER, category_id: null, period_start: '2026-10-01', period_end: '2026-10-31', limit_minor: 6_500_000, currency: 'INR', is_demo: true },
    { id: 'budget-dining-oct', user_id: PREVIEW_USER, category_id: 'cat-dining', period_start: '2026-10-01', period_end: '2026-10-31', limit_minor: 600_000, currency: 'INR', is_demo: true },
    { id: 'budget-shopping-oct', user_id: PREVIEW_USER, category_id: 'cat-shopping', period_start: '2026-10-01', period_end: '2026-10-31', limit_minor: 700_000, currency: 'INR', is_demo: true },
  ];
  return { profile, categories, catalog, cards, budgets, transactions, rewardRules: [] };
}

export function createPublicDemoWorkspace(): WorkspaceData {
  return readWorkspace(PUBLIC_DEMO_STORAGE_KEY);
}

function readWorkspace(key: string): WorkspaceData {
  if (typeof window === 'undefined') return defaultPreview();
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return defaultPreview();
    const parsed = JSON.parse(stored) as WorkspaceData;
    if (parsed.profile.id === PREVIEW_USER && parsed.profile.display_name === 'Aarav Mehta') parsed.profile.display_name = 'Mira Nair';
    const seededCards = new Map(defaultPreview().cards.map((card) => [card.catalog_card_id, card]));
    parsed.cards = parsed.cards.map((card) => ({ ...seededCards.get(card.catalog_card_id), ...card } as WalletCard));
    return parsed;
  } catch {
    return defaultPreview();
  }
}

function readPreview(): WorkspaceData {
  return readWorkspace(PREVIEW_KEY);
}

function isPublicDemo() {
  return typeof window !== 'undefined' && isPublicDemoLocation(window.location.search);
}

function isLocalWorkspace() {
  return usesLocalWorkspace(isPublicDemo(), isSupabaseConfigured);
}

function readLocalWorkspace() {
  return readWorkspace(workspaceStorageKey(isPublicDemo()));
}

function writeLocalWorkspace(data: WorkspaceData) {
  if (typeof window === 'undefined') return;
  const key = workspaceStorageKey(isPublicDemo());
  window.localStorage.setItem(key, JSON.stringify(data));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `cw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function authenticatedUserId() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Your session has expired. Please sign in again.');
  return data.user.id;
}

function assertOk(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getSession() {
  if (isPublicDemo()) return null;
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  assertOk(error);
  return data.session;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  assertOk(error);
  return data.session;
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });
  assertOk(error);
  return data.session;
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    assertOk(error);
  }
}

export async function requestPasswordReset(email: string) {
  const client = requireSupabase();
  await sendPasswordReset(client, email, `${window.location.origin}/reset-password`);
}

export async function saveRecoveredPassword(password: string) {
  const client = requireSupabase();
  await updateRecoveredPassword(client, password);
}

export async function loadWorkspace(): Promise<WorkspaceData | null> {
  if (isPublicDemo()) return createPublicDemoWorkspace();
  if (!isSupabaseConfigured && import.meta.env.DEV) return readPreview();
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.');
  const client = requireSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  assertOk(authError);
  if (!auth.user) return null;

  const [profileRes, categoriesRes, catalogRes, cardsRes, budgetsRes, transactions, rewardRulesRes] = await Promise.all([
    client.from('profiles').select('*').single(),
    client.from('categories').select('*').order('name'),
    client.from('credit_card_catalog').select('*').eq('is_active', true).order('issuer_name'),
    client.from('user_cards').select('*, catalog:credit_card_catalog(*)').order('created_at'),
    client.from('budgets').select('*').order('period_start', { ascending: false }),
    fetchAllPages(async (start, end) => {
      const { data, error } = await client.from('transactions').select('*')
        .order('occurred_at', { ascending: false }).order('id', { ascending: false }).range(start, end);
      assertOk(error);
      return (data ?? []) as Transaction[];
    }),
    client.from('card_reward_rules').select('*').not('verified_at', 'is', null),
  ]);
  [profileRes, categoriesRes, catalogRes, cardsRes, budgetsRes, rewardRulesRes].forEach((res) => assertOk(res.error));
  return {
    profile: profileRes.data as Profile,
    categories: categoriesRes.data as Category[],
    catalog: catalogRes.data as CatalogCard[],
    cards: (cardsRes.data as Array<WalletCard & { catalog: CatalogCard }>).map((card) => ({ ...card, catalog: card.catalog })),
    budgets: budgetsRes.data as Budget[],
    transactions,
    rewardRules: rewardRulesRes.data as RewardRule[],
  };
}

export async function searchCatalog(query: string, data: WorkspaceData) {
  const term = query.trim().slice(0, 80);
  if (!term) return [];
  return searchCatalogRecords(term, data.catalog);
}

export type WalletCardDetails = Pick<WalletCard, 'credit_limit_minor' | 'statement_balance_minor' | 'due_date' | 'minimum_due_minor' | 'reward_points' | 'personal_notes'>;

export async function saveWalletCard(catalogCard: CatalogCard, monthlyBudgetMinor: number | null, existingId?: string, nickname: string | null = null, lastFour: string | null = null, details: WalletCardDetails = {
  credit_limit_minor: null, statement_balance_minor: null, due_date: null, minimum_due_minor: null, reward_points: null, personal_notes: null,
}): Promise<string> {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    const found = findWalletCardToUpdate(data.cards, existingId);
    if (found) {
      found.monthly_budget_minor = monthlyBudgetMinor;
      found.nickname = nickname;
      found.last_four = lastFour;
      Object.assign(found, details);
      writeLocalWorkspace(data);
      return found.id;
    } else {
      const id = makeId();
      data.cards.push({
        id, user_id: data.profile.id, catalog_card_id: catalogCard.id, nickname,
        card_type: 'credit', last_four: lastFour, monthly_budget_minor: monthlyBudgetMinor, ...details, is_demo: true, catalog: catalogCard,
      });
      writeLocalWorkspace(data);
      return id;
    }
  }
  const userId = await authenticatedUserId();
  const payload = { user_id: userId, catalog_card_id: catalogCard.id, monthly_budget_minor: monthlyBudgetMinor, card_type: 'credit', nickname, last_four: lastFour, ...details };
  const client = requireSupabase();
  const result = existingId
    ? await client.from('user_cards').update(payload).eq('id', existingId).select('id').single()
    : await client.from('user_cards').insert(payload).select('id').single();
  assertOk(result.error);
  if (!result.data) throw new Error('Card could not be saved to your wallet.');
  return result.data.id;
}

export async function removeWalletCard(id: string) {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    data.cards = data.cards.filter((card) => card.id !== id);
    data.transactions = clearRemovedCardLinks(data.transactions, id);
    writeLocalWorkspace(data);
    return;
  }
  const { error } = await requireSupabase().from('user_cards').delete().eq('id', id);
  assertOk(error);
}

export async function saveTransaction(input: TransactionInput, id?: string) {
  let expectedCurrency: string | undefined;
  if (isLocalWorkspace()) expectedCurrency = readLocalWorkspace().profile.preferred_currency;
  else {
    const profile = await requireSupabase().from('profiles').select('preferred_currency').single();
    assertOk(profile.error);
    if (!profile.data) throw new Error('Your profile currency could not be loaded.');
    expectedCurrency = profile.data.preferred_currency;
  }
  if (input.currency !== expectedCurrency) {
    throw new Error('Transaction currency must match your profile currency.');
  }
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    if (id) data.transactions = data.transactions.map((row) => row.id === id ? { ...row, ...input } : row);
    else data.transactions.unshift({ ...input, id: makeId(), user_id: data.profile.id });
    writeLocalWorkspace(data);
    return;
  }
  const userId = await authenticatedUserId();
  const payload = { ...input, user_id: userId };
  const result = id
    ? await requireSupabase().from('transactions').update(payload).eq('id', id)
    : await requireSupabase().from('transactions').insert(payload);
  assertOk(result.error);
}

export async function saveTransactions(inputs: TransactionInput[]) {
  if (inputs.length === 0) return { imported: 0, failed: 0 };
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    if (inputs.some((input) => input.currency !== data.profile.preferred_currency)) throw new Error('Imported currency must match your profile currency.');
    data.transactions.unshift(...inputs.map((input) => ({ ...input, dedupe_key: transactionDedupeKey(input, data.profile.timezone), id: makeId(), user_id: data.profile.id })));
    writeLocalWorkspace(data);
    return { imported: inputs.length, failed: 0 };
  }
  const userId = await authenticatedUserId();
  const profile = await requireSupabase().from('profiles').select('preferred_currency,timezone').single();
  assertOk(profile.error);
  if (!profile.data) throw new Error('Your profile currency could not be loaded.');
  if (inputs.some((input) => input.currency !== profile.data.preferred_currency)) throw new Error('Imported currency must match your profile currency.');
  let imported = 0;
  let failed = 0;
  for (let offset = 0; offset < inputs.length; offset += 100) {
    const batch = inputs.slice(offset, offset + 100).map((input) => ({ ...input, dedupe_key: transactionDedupeKey(input, profile.data.timezone), user_id: userId }));
    const { error } = await requireSupabase().from('transactions').insert(batch);
    if (error) failed += batch.length;
    else imported += batch.length;
  }
  return { imported, failed };
}

export async function removeTransaction(id: string) {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    data.transactions = data.transactions.filter((row) => row.id !== id);
    writeLocalWorkspace(data);
    return;
  }
  const { error } = await requireSupabase().from('transactions').delete().eq('id', id);
  assertOk(error);
}

export async function saveBudget(input: BudgetInput, id?: string) {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    if (input.currency !== data.profile.preferred_currency) throw new Error('Budget currency must match your profile currency.');
    if (id) data.budgets = data.budgets.map((row) => row.id === id ? { ...row, ...input } : row);
    else {
      if (hasBudgetConflict(data.budgets, input)) throw new Error('A budget already exists for this category and month. Edit the existing budget instead.');
      data.budgets.unshift({ ...input, id: makeId(), user_id: data.profile.id, is_demo: true });
    }
    writeLocalWorkspace(data);
    return;
  }
  const userId = await authenticatedUserId();
  const profile = await requireSupabase().from('profiles').select('preferred_currency').single();
  assertOk(profile.error);
  if (!profile.data) throw new Error('Your profile currency could not be loaded.');
  if (input.currency !== profile.data.preferred_currency) throw new Error('Budget currency must match your profile currency.');
  const payload = { ...input, user_id: userId };
  const client = requireSupabase();
  if (id) {
    const { error } = await client.from('budgets').update(payload).eq('id', id);
    assertOk(error);
    return;
  }
  let lookup = client.from('budgets').select('id').eq('user_id', userId).eq('period_start', input.period_start);
  lookup = input.category_id ? lookup.eq('category_id', input.category_id) : lookup.is('category_id', null);
  const { data: existing, error: lookupError } = await lookup.maybeSingle();
  assertOk(lookupError);
  if (existing) throw new Error('A budget already exists for this category and month. Edit the existing budget instead.');
  const result = await client.from('budgets').insert(payload);
  assertOk(result.error);
}

export async function removeBudget(id: string) {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    data.budgets = data.budgets.filter((budget) => budget.id !== id);
    writeLocalWorkspace(data);
    return;
  }
  const { error } = await requireSupabase().from('budgets').delete().eq('id', id);
  assertOk(error);
}

export async function saveProfile(input: Pick<Profile, 'display_name' | 'city' | 'occupation' | 'monthly_income_minor'>) {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    data.profile = { ...data.profile, ...input };
    writeLocalWorkspace(data);
    return;
  }
  const { error } = await requireSupabase().from('profiles').update(input).eq('id', await authenticatedUserId());
  assertOk(error);
}

export async function deleteMyFinancialData() {
  if (isLocalWorkspace()) {
    const data = readLocalWorkspace();
    data.cards = [];
    data.budgets = [];
    data.transactions = [];
    writeLocalWorkspace(data);
    return;
  }
  const { error } = await requireSupabase().rpc('delete_my_financial_data');
  assertOk(error);
}

export async function deleteMyAccount() {
  if (isLocalWorkspace()) throw new Error('Account deletion is unavailable in the local demo workspace.');
  const client = requireSupabase();
  const { error } = await client.functions.invoke('delete-account', { method: 'POST', body: {} });
  if (error) {
    const serverMessage = await readFunctionErrorMessage(error);
    throw new Error(serverMessage ?? error.message ?? 'Your account could not be deleted.');
  }
  const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
  assertOk(signOutError);
}

export function resetPreview() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(PREVIEW_KEY);
}

export function isPreviewMode() {
  return !isSupabaseConfigured && import.meta.env.DEV;
}
