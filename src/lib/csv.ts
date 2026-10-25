import type { Category, Transaction, TransactionInput, TransactionType, WorkspaceData } from '../domain/types';
import { parseINRAmount } from './format';

export interface CsvPreviewRow {
  rowNumber: number;
  input: TransactionInput | null;
  errors: string[];
  duplicateOf: string | null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('The CSV has an opening quote without a matching closing quote.');
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rowInput(values: Record<string, string>, categories: Category[]): { input: TransactionInput | null; errors: string[] } {
  const errors: string[] = [];
  const amount = values.amount?.trim() ?? '';
  const amountMinor = parseINRAmount(amount);
  if (amountMinor === null) errors.push('Amount must be a positive INR amount with up to two decimals.');
  const date = values.date?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) errors.push('Date must use YYYY-MM-DD.');
  const merchant = (values.merchant || values.description || '').trim();
  if (!merchant) errors.push('Merchant or description is required.');
  const typeValue = (values.type || 'expense').trim().toLowerCase();
  const allowedTypes: TransactionType[] = ['expense', 'income', 'refund', 'transfer'];
  if (!allowedTypes.includes(typeValue as TransactionType)) errors.push('Type must be expense, income, refund, or transfer.');
  const categorySlug = slug(values.category || 'uncategorized');
  const category = categories.find((item) => item.slug === categorySlug || slug(item.name) === categorySlug);
  const uncategorized = categories.find((item) => item.slug === 'uncategorized');
  if (!category && categorySlug !== 'uncategorized') errors.push(`Category “${values.category}” is not in your category list.`);
  if (errors.length > 0 || amountMinor === null) return { input: null, errors };
  return {
    input: {
      card_id: null,
      category_id: (category ?? uncategorized)?.id ?? null,
      amount_minor: amountMinor,
      currency: 'INR',
      transaction_type: typeValue as TransactionType,
      merchant,
      description: values.description?.trim() || null,
      occurred_at: `${date}T12:00:00+05:30`,
      source: 'csv_import',
      is_demo: false,
      recurring: false,
      spend_channel: 'unknown',
    },
    errors: [],
  };
}

function duplicateKey(input: TransactionInput) {
  return [input.occurred_at.slice(0, 10), input.amount_minor, input.transaction_type, input.merchant.trim().toLowerCase()].join('|');
}

export function previewTransactionCsv(text: string, categories: Category[], existing: Transaction[]): CsvPreviewRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((value) => value.trim().toLowerCase());
  const required = ['date', 'amount'];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length > 0) throw new Error(`CSV is missing required columns: ${missing.join(', ')}.`);
  const seen = new Map<string, string>();
  for (const transaction of existing) {
    const input: TransactionInput = { ...transaction, category_id: transaction.category_id, card_id: transaction.card_id };
    seen.set(duplicateKey(input), transaction.id);
  }
  return rows.slice(1).map((cells, index) => {
    const values = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? '']));
    const parsed = rowInput(values, categories);
    if (!parsed.input) return { rowNumber: index + 2, input: null, errors: parsed.errors, duplicateOf: null };
    const key = duplicateKey(parsed.input);
    const duplicateOf = seen.get(key) ?? null;
    const syntheticId = `csv-row-${index + 2}`;
    seen.set(key, syntheticId);
    return { rowNumber: index + 2, input: parsed.input, errors: [], duplicateOf };
  });
}

function escapeCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportTransactionsCsv(rows: Transaction[], workspace: WorkspaceData) {
  const headers = ['date', 'amount', 'currency', 'type', 'merchant', 'description', 'category', 'card', 'source', 'demo'];
  const output = [headers.join(',')];
  for (const transaction of rows) {
    const category = workspace.categories.find((item) => item.id === transaction.category_id)?.name ?? 'Uncategorized';
    const card = workspace.cards.find((item) => item.id === transaction.card_id)?.catalog.card_name ?? '';
    const cells = [
      transaction.occurred_at.slice(0, 10), (transaction.amount_minor / 100).toFixed(2), transaction.currency,
      transaction.transaction_type, transaction.merchant, transaction.description, category, card, transaction.source, transaction.is_demo,
    ];
    output.push(cells.map(escapeCell).join(','));
  }
  return output.join('\r\n');
}
