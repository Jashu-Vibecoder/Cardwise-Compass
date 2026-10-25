import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const projectRef = process.env.CARDWISE_PROJECT_REF?.trim();
if (!projectRef) throw new Error('Set CARDWISE_PROJECT_REF to the Supabase project you intend to manage.');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const month = process.env.DEMO_MONTH || new Date().toISOString().slice(0, 7);
const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
if (!monthMatch) throw new Error('DEMO_MONTH must use YYYY-MM.');
const [year, monthNumber] = month.split('-').map(Number);
const periodStart = `${month}-01`;
const periodEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
const dueMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);

const demoUsers = [
  {
    key: 'A', email: process.env.DEMO_USER_A_EMAIL, display_name: 'Mira Nair', city: 'Bengaluru',
    occupation: 'Product designer · Salaried', monthly_income_minor: 7_500_000,
    cards: [
      ['HDFC Bank', 'Millennia', 9_100_000, 20_000_000, 4_500_000, 15, 450_000, 12_500, 'Useful for online shopping and everyday rewards.'],
      ['SBI Card', 'Cashback SBI Card', 5_000_000, 15_000_000, 8_200_000, 10, 820_000, 4_200, 'Use for household and grocery purchases.'],
      ['Axis Bank', 'ACE Credit Card', 3_500_000, 10_000_000, 1_500_000, 22, 150_000, 3_800, 'Keep for utility payments.'],
      ['ICICI Bank', 'Amazon Pay ICICI Bank Credit Card', 4_000_000, 25_000_000, 12_000_000, 8, 1_200_000, 9_000, 'Work and travel purchases.'],
    ],
    budgets: [
      { category: null, limit_minor: 6_500_000 }, { category: 'dining', limit_minor: 600_000 },
      { category: 'shopping', limit_minor: 700_000 },
    ],
    previous: [
      ['income', 7_500_000, 'Studio North', 'Salary', 'uncategorized', 1, 1],
      ['expense', 2_400_000, 'Lakeview Homes', 'Rent', 'housing', 1, 2],
      ['expense', 480_000, 'Namdhari Fresh', 'Groceries', 'groceries', 2, 5],
      ['expense', 320_000, 'Swiggy', 'Food delivery', 'dining', 3, 8],
      ['expense', 190_000, 'Namma Metro', 'Commute', 'transport', 2, 11],
      ['expense', 290_000, 'BESCOM', 'Utilities', 'utilities', 1, 12],
      ['expense', 400_000, 'Myntra', 'Shopping', 'shopping', 4, 16],
      ['expense', 90_000, 'Apollo Pharmacy', 'Health', 'health', 1, 20],
      ['expense', 70_000, 'Spotify', 'Monthly plan', 'subscriptions', 1, 21],
    ],
    current: [
      ['income', 7_500_000, 'Studio North', 'Salary', 'uncategorized', 1, 1],
      ['expense', 2_400_000, 'Lakeview Homes', 'Rent', 'housing', 1, 2],
      ['expense', 218_000, 'Namdhari Fresh', 'Weekly groceries', 'groceries', 2, 3],
      ['expense', 34_500, 'Third Wave Coffee', 'Coffee with a friend', 'dining', 3, 4],
      ['expense', 49_000, 'Namma Metro', 'Commute', 'transport', 2, 5],
      ['expense', 116_000, 'BESCOM', 'Electricity', 'utilities', 1, 7],
      ['expense', 624_000, 'Croma', 'Work headphones', 'shopping', 4, 9],
      ['expense', 286_000, 'Swiggy', 'Dinner delivery', 'dining', 3, 10],
      ['expense', 302_000, 'BigBasket', 'Household staples', 'groceries', 2, 12],
      ['expense', 120_000, 'Apollo Pharmacy', 'Health essentials', 'health', 1, 14],
      ['expense', 161_000, 'Ola', 'Airport ride', 'transport', 3, 16],
      ['expense', 69_900, 'Spotify', 'Monthly plan', 'subscriptions', 1, 17],
      ['expense', 250_000, 'Coursera', 'Design course', 'education', 4, 18],
      ['expense', 216_000, 'Myntra', 'Workwear', 'shopping', '4', 20],
      ['expense', 145_000, 'Taaza Thindi', 'Breakfast out', 'dining', 3, 22],
    ],
  },
  {
    key: 'B', email: process.env.DEMO_USER_B_EMAIL, display_name: 'Nisha Iyer', city: 'Mysuru',
    occupation: 'UX researcher · Independent consultant', monthly_income_minor: 10_500_000,
    cards: [
      ['HDFC Bank', 'Millennia', 6_000_000, 15_000_000, 3_800_000, 14, 380_000, 8_900, 'Use for online purchases and monthly subscriptions.'],
      ['Axis Bank', 'ACE Credit Card', 4_500_000, 10_000_000, 3_200_000, 20, 320_000, 2_600, 'Good for regular bill payments.'],
      ['ICICI Bank', 'Amazon Pay ICICI Bank Credit Card', 5_500_000, 25_000_000, 9_800_000, 11, 980_000, 10_400, 'Track marketplace purchases here.'],
    ],
    budgets: [
      { category: null, limit_minor: 8_000_000 }, { category: 'housing', limit_minor: 3_000_000 },
      { category: 'dining', limit_minor: 800_000 },
    ],
    previous: [
      ['income', 10_500_000, 'Client retainer', 'September retainer', 'uncategorized', 1, 1],
      ['expense', 2_800_000, 'Chamundi Residences', 'Rent', 'housing', 1, 2],
      ['expense', 620_000, 'More Supermarket', 'Groceries', 'groceries', 2, 5],
      ['expense', 510_000, 'Cafe Aramane', 'Dining', 'dining', 3, 8],
      ['expense', 275_000, 'KSRTC', 'Travel', 'transport', 2, 11],
      ['expense', 340_000, 'CESC Mysuru', 'Utilities', 'utilities', 1, 12],
      ['expense', 320_000, 'Fabindia', 'Home and clothing', 'shopping', 3, 16],
      ['expense', 145_000, 'Apollo Pharmacy', 'Health', 'health', 1, 20],
      ['expense', 120_000, 'YouTube Premium', 'Monthly plan', 'subscriptions', 1, 21],
    ],
    current: [
      ['income', 10_500_000, 'Client retainer', 'October retainer', 'uncategorized', 1, 1],
      ['expense', 2_800_000, 'Chamundi Residences', 'Rent', 'housing', 1, 2],
      ['expense', 675_000, 'More Supermarket', 'Groceries', 'groceries', 2, 3],
      ['expense', 630_000, 'Cafe Aramane', 'Dining', 'dining', 3, 5],
      ['expense', 328_000, 'KSRTC', 'Intercity travel', 'transport', 2, 7],
      ['expense', 360_000, 'CESC Mysuru', 'Utilities', 'utilities', 1, 9],
      ['expense', 510_000, 'Fabindia', 'Home textiles', 'shopping', 3, 11],
      ['expense', 195_000, 'Apollo Pharmacy', 'Health essentials', 'health', 1, 13],
      ['expense', 120_000, 'YouTube Premium', 'Monthly plan', 'subscriptions', 1, 14],
      ['expense', 465_000, 'Swiggy', 'Dinner', 'dining', 3, 16],
      ['expense', 225_000, 'Udemy', 'Research course', 'education', 1, 18],
      ['expense', 285_000, 'Myntra', 'Clothing', 'shopping', 3, 20],
    ],
  },
];

function assertTarget() {
  if (process.env.CARDWISE_PROJECT_REF !== projectRef) throw new Error(`Set CARDWISE_PROJECT_REF=${projectRef} to confirm the target project.`);
  if (process.env.CARDWISE_DEMO_SETUP !== 'YES') throw new Error('Set CARDWISE_DEMO_SETUP=YES to confirm demo-user provisioning.');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a local shell environment.');
  if (new URL(process.env.SUPABASE_URL).hostname !== `${projectRef}.supabase.co`) throw new Error('SUPABASE_URL does not match the confirmed Cardwise project reference.');
  if (demoUsers.some((user) => !user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))) throw new Error('Set valid DEMO_USER_A_EMAIL and DEMO_USER_B_EMAIL values.');
  if (demoUsers[0].email.toLowerCase() === demoUsers[1].email.toLowerCase()) throw new Error('Demo users need two distinct email addresses.');
}

function generatedPassword() { return `${randomBytes(30).toString('base64url')}!9a`; }
function dateFor(monthValue, day) {
  const [yy, mm] = monthValue.split('-').map(Number);
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${monthValue}-${String(Math.min(day, last)).padStart(2, '0')}T12:00:00+05:30`;
}
function assertOk(error, action) { if (error) throw new Error(`${action}: ${error.message}`); }

assertTarget();
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// Inspect the catalogue, categories, and exact demo emails before any write.
const [catalogResult, categoriesResult] = await Promise.all([
  admin.from('credit_card_catalog').select('id,issuer_name,card_name').limit(2000),
  admin.from('categories').select('id,slug').is('owner_id', null),
]);
assertOk(catalogResult.error, 'Could not inspect the catalogue');
assertOk(categoriesResult.error, 'Could not inspect the default categories');
const catalogByName = new Map((catalogResult.data || []).map((card) => [`${card.issuer_name.toLowerCase()}|${card.card_name.toLowerCase()}`, card.id]));
const categoryBySlug = new Map((categoriesResult.data || []).map((category) => [category.slug, category.id]));
for (const user of demoUsers) {
  for (const [issuer, cardName] of user.cards) {
    if (!catalogByName.has(`${issuer.toLowerCase()}|${cardName.toLowerCase()}`)) throw new Error(`Catalogue is missing ${issuer} / ${cardName}. Import candidates and apply reviewed identity records first.`);
  }
  for (const budget of user.budgets) if (budget.category && !categoryBySlug.has(budget.category)) throw new Error(`Default category “${budget.category}” is missing.`);
  for (const row of [...user.previous, ...user.current]) if (!categoryBySlug.has(row[4])) throw new Error(`Default category “${row[4]}” is missing.`);
}

const listedUsers = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  assertOk(error, 'Could not inspect existing auth users');
  listedUsers.push(...(data.users || []));
  if ((data.users || []).length < 1000) break;
}
const existingByEmail = new Map(listedUsers.map((user) => [user.email?.toLowerCase(), user]));
const existingDemoAccounts = new Map();
// Complete all safety checks before creating either user or changing financial records.
for (const demo of demoUsers) {
  const existing = existingByEmail.get(demo.email.toLowerCase());
  if (existing && existing.user_metadata?.cardwise_demo !== true) throw new Error(`The address ${demo.email} is already used by an account not marked as a Cardwise demo. Choose another demo email.`);
  if (!existing) continue;
  const [txRes, budgetRes, cardRes] = await Promise.all([
    admin.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', existing.id).eq('is_demo', false),
    admin.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', existing.id).eq('is_demo', false),
    admin.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', existing.id).eq('is_demo', false),
  ]);
  assertOk(txRes.error, 'Could not inspect demo transaction ownership');
  assertOk(budgetRes.error, 'Could not inspect demo budget ownership');
  assertOk(cardRes.error, 'Could not inspect demo card ownership');
  if ((txRes.count || 0) + (budgetRes.count || 0) + (cardRes.count || 0) > 0) {
    throw new Error(`Demo account ${demo.email} contains non-demo financial records. Refusing to reset or seed over those records.`);
  }
  existingDemoAccounts.set(demo.email.toLowerCase(), existing);
}

async function saveCredentials(credentialRows) {
  if (!credentialRows.length) return;
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const credentialPath = resolve(scriptDir, `../.demo-credentials-${stamp}.txt`);
  const content = [
    'PRIVATE LOCAL FILE - do not commit or share publicly.',
    `Supabase project: ${projectRef}`,
    `Synthetic data month: ${month}`,
    ...credentialRows.flatMap((demo) => ['', `Demo user ${demo.key}: ${demo.display_name}`, `Email: ${demo.email}`, `Temporary password: ${demo.password}`]),
    '',
  ].join('\n');
  await writeFile(credentialPath, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  console.log(`Created demo user credentials in a gitignored local file: ${credentialPath}`);
}

const prepared = [];
try {
  for (const demo of demoUsers) {
    const existing = existingDemoAccounts.get(demo.email.toLowerCase());
    if (existing) {
      prepared.push({ ...demo, id: existing.id, password: null, newlyCreated: false });
      continue;
    }
    const password = generatedPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: demo.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: demo.display_name, cardwise_demo: true, cardwise_demo_version: 1 },
    });
    assertOk(error, `Could not create the synthetic demo auth user ${demo.email}`);
    prepared.push({ ...demo, id: data.user.id, password, newlyCreated: true });
  }
} catch (creationError) {
  await saveCredentials(prepared.filter((demo) => demo.password));
  throw creationError;
}

const credentialRows = prepared.filter((demo) => demo.password);
await saveCredentials(credentialRows);

for (const demo of prepared) {
  const { error: profileError } = await admin.from('profiles').upsert({
    id: demo.id, display_name: demo.display_name, city: demo.city, occupation: demo.occupation,
    monthly_income_minor: demo.monthly_income_minor, preferred_currency: 'INR', timezone: 'Asia/Kolkata',
  }, { onConflict: 'id' });
  assertOk(profileError, `Could not prepare the synthetic profile for ${demo.email}`);
  // Reseed removes only rows carrying this script's explicit synthetic marker.
  for (const table of ['transactions', 'budgets', 'user_cards']) {
    const { error } = await admin.from(table).delete().eq('user_id', demo.id).eq('is_demo', true);
    assertOk(error, `Could not clear prior synthetic ${table} for ${demo.email}`);
  }
  const desiredCards = demo.cards.map(([issuer, cardName, budget, creditLimit, outstanding, dueDay, minimumDue, rewardPoints, notes]) => ({
    user_id: demo.id,
    catalog_card_id: catalogByName.get(`${issuer.toLowerCase()}|${cardName.toLowerCase()}`),
    card_type: 'credit',
    monthly_budget_minor: budget,
    credit_limit_minor: creditLimit,
    statement_balance_minor: outstanding,
    due_date: dateFor(dueMonth, dueDay).slice(0, 10),
    minimum_due_minor: minimumDue,
    reward_points: rewardPoints,
    personal_notes: notes,
    is_demo: true,
  }));
  const { data: wallets, error: walletError } = await admin.from('user_cards').insert(desiredCards).select('id,catalog_card_id');
  assertOk(walletError, `Could not seed the saved cards for ${demo.email}`);
  const cardIdByCatalogId = new Map((wallets || []).map((card) => [card.catalog_card_id, card.id]));

  const budgetRows = demo.budgets.map((budget) => ({
    user_id: demo.id,
    category_id: budget.category ? categoryBySlug.get(budget.category) : null,
    period_start: periodStart,
    period_end: periodEnd,
    limit_minor: budget.limit_minor,
    currency: 'INR',
    is_demo: true,
  }));
  const { error: budgetError } = await admin.from('budgets').insert(budgetRows);
  assertOk(budgetError, `Could not seed budgets for ${demo.email}`);

  for (const [period, rows] of [['previous', demo.previous], ['current', demo.current]]) {
    const targetMonth = period === 'previous' ? previousMonth : month;
    const transactions = rows.map(([type, amount, merchant, description, category, cardIndex, day], index) => {
      const [issuer, cardName] = demo.cards[Number(cardIndex) - 1];
      const catalogId = catalogByName.get(`${issuer.toLowerCase()}|${cardName.toLowerCase()}`);
      const cardId = cardIdByCatalogId.get(catalogId);
      return {
        user_id: demo.id,
        card_id: cardId || null,
        category_id: categoryBySlug.get(category),
        amount_minor: amount,
        currency: 'INR',
        transaction_type: type,
        merchant,
        description,
        occurred_at: dateFor(targetMonth, Number(day)),
        source: 'demo',
        source_reference: `cardwise-demo-v1:${period}:${index + 1}`,
        dedupe_key: `cardwise-demo-v1:${targetMonth}:${period}:${index + 1}`,
        is_demo: true,
        recurring: false,
        spend_channel: 'unknown',
      };
    });
    const { error: transactionError } = await admin.from('transactions').insert(transactions);
    assertOk(transactionError, `Could not seed ${period} transactions for ${demo.email}`);
  }
}

if (!credentialRows.length) {
  console.log('Both demo users already existed; their passwords were unchanged. Use Supabase password reset if access needs to be restored.');
}
console.log(`Seeded two separate authenticated demo profiles and synthetic records for ${month}. Reset affects only records marked is_demo=true on those two Cardwise demo users.`);
