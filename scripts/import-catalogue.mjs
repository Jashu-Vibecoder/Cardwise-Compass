import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'hypqxmyhktewycnqluol';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultCsv = resolve(scriptDir, '../../indian_credit_cards_list.csv');
const csvPath = resolve(process.env.CARD_CATALOGUE_CSV || process.argv[2] || defaultCsv);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (quoted) throw new Error('Catalogue CSV contains an unmatched quote.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function clean(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeIssuer(value) {
  const issuer = clean(value);
  const aliases = new Map([
    ['hdfc', 'HDFC Bank'], ['hdfc bank', 'HDFC Bank'], ['axis', 'Axis Bank'], ['axis bank', 'Axis Bank'],
    ['icici', 'ICICI Bank'], ['icici bank', 'ICICI Bank'], ['sbi', 'SBI Card'], ['sbi card', 'SBI Card'],
    ['hsbc', 'HSBC India'], ['hsbc india', 'HSBC India'], ['federal bank', 'Federal Bank'],
    ['idfc first', 'IDFC FIRST Bank'], ['idfc first bank', 'IDFC FIRST Bank'],
  ]);
  return aliases.get(issuer.toLowerCase()) || issuer;
}

function readCandidates(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('Catalogue CSV must have a header and at least one card.');
  const headers = rows[0].map((value) => clean(value).toLowerCase());
  const bankIndex = headers.indexOf('bank');
  const cardIndex = headers.indexOf('card name');
  const categoryIndex = headers.indexOf('category');
  const benefitIndex = headers.indexOf('primary benefit');
  if ([bankIndex, cardIndex, categoryIndex, benefitIndex].some((index) => index < 0)) {
    throw new Error('Expected CSV columns: Bank, Card Name, Category, Primary Benefit.');
  }
  const seen = new Set();
  return rows.slice(1).map((row, index) => {
    const issuer_name = normalizeIssuer(row[bankIndex] || '');
    const card_name = clean(row[cardIndex] || '');
    const category = clean(row[categoryIndex] || '');
    const benefitClaim = clean(row[benefitIndex] || '');
    if (!issuer_name || !card_name || !category || !benefitClaim) throw new Error(`Row ${index + 2} has a missing field.`);
    const key = `${issuer_name.toLowerCase()}|${card_name.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Duplicate issuer/card name at row ${index + 2}: ${issuer_name} / ${card_name}.`);
    seen.add(key);
    // The CSV benefit claim is intentionally not written to the catalogue until reviewed against issuer terms.
    return { issuer_name, card_name, category, verification_status: 'unverified', is_active: true };
  });
}

function assertProject() {
  if (process.env.CARDWISE_PROJECT_REF !== projectRef) throw new Error(`Set CARDWISE_PROJECT_REF=${projectRef} to confirm the target project.`);
  if (process.env.CARDWISE_IMPORT_CATALOGUE !== 'YES') throw new Error('Set CARDWISE_IMPORT_CATALOGUE=YES to confirm this catalogue import.');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a local shell environment.');
  const host = new URL(process.env.SUPABASE_URL).hostname;
  if (host !== `${projectRef}.supabase.co`) throw new Error('SUPABASE_URL does not match the confirmed Cardwise project reference.');
}

assertProject();
const candidates = readCandidates(await readFile(csvPath, 'utf8'));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existing, error: inspectError } = await supabase.from('credit_card_catalog').select('issuer_name,card_name').limit(2000);
if (inspectError) throw new Error(`Catalogue table is not ready or could not be inspected: ${inspectError.message}`);
const existingKeys = new Set((existing || []).map((row) => `${row.issuer_name.toLowerCase()}|${row.card_name.toLowerCase()}`));
const newRows = candidates.filter((row) => !existingKeys.has(`${row.issuer_name.toLowerCase()}|${row.card_name.toLowerCase()}`));
if (newRows.length) {
  const { error } = await supabase.from('credit_card_catalog').upsert(newRows, { onConflict: 'issuer_name,card_name', ignoreDuplicates: true });
  if (error) throw new Error(`Catalogue import failed: ${error.message}`);
}
console.log(`Validated ${candidates.length} unique catalogue candidates; added ${newRows.length}; kept ${candidates.length - newRows.length} existing records unchanged.`);
console.log('Primary Benefit text was not imported because the CSV claims have not been verified against current issuer terms.');
