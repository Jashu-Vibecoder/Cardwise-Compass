import { describe, expect, it } from 'vitest';
import { exportTransactionsCsv, parseCsv, previewTransactionCsv } from './csv';
import type { Category, Transaction, WorkspaceData } from '../domain/types';

const categories: Category[] = [
  { id: 'food', slug: 'food-dining', name: 'Food & dining', color: '#f69d56' },
  { id: 'uncategorized', slug: 'uncategorized', name: 'Uncategorized', color: '#9aa5b5' },
];

describe('transaction CSV', () => {
  it('parses quoted commas and escaped quotes', () => {
    expect(parseCsv('merchant,description\n"Cafe, North","He said ""hello"""')).toEqual([
      ['merchant', 'description'], ['Cafe, North', 'He said "hello"'],
    ]);
  });

  it('parses semicolon separated exports and accepts INR formatting', () => {
    const preview = previewTransactionCsv(
      'date;amount;merchant\n2026-10-05;₹ 1,250.50;Market', categories, [],
    );
    expect(preview[0].input?.amount_minor).toBe(125_050);
  });

  it('rejects impossible calendar dates instead of normalizing them', () => {
    const preview = previewTransactionCsv('date,amount,merchant\n2026-02-31,10.00,Market', categories, []);
    expect(preview[0].errors).toContain('Date must use a real YYYY-MM-DD calendar date.');
  });

  it('validates rows and marks duplicate candidates before import', () => {
    const existing: Transaction[] = [{
      id: 'existing', user_id: 'u', card_id: null, category_id: 'food', amount_minor: 12_500, currency: 'INR',
      transaction_type: 'expense', merchant: 'Cafe, North', description: null, occurred_at: '2026-10-02T12:00:00+05:30',
      source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown',
    }];
    const csv = [
      'date,amount,merchant,type,category,description',
      '2026-10-02,125.00,"Cafe, North",expense,Food & dining,"Morning coffee"',
      '2026-10-03,-2.00,Invalid,expense,Food & dining,negative amount',
      '2026-10-04,8.50,Market,expense,Food & dining,groceries',
    ].join('\n');
    const preview = previewTransactionCsv(csv, categories, existing);
    expect(preview[0].duplicateOf).toBeNull();
    expect(preview[1].input).toBeNull();
    expect(preview[1].errors).toHaveLength(1);
    expect(preview[2].input?.source).toBe('csv_import');
    expect(preview[2].input?.amount_minor).toBe(850);
  });

  it('maps a negative amount without a type column to a positive expense', () => {
    const preview = previewTransactionCsv('date,amount,merchant\n2026-10-04,-8.50,Market', categories, []);
    expect(preview[0].input).toMatchObject({ amount_minor: 850, transaction_type: 'expense' });
  });

  it('marks repeated rows as duplicates only when all identifying fields match', () => {
    const preview = previewTransactionCsv([
      'date,amount,merchant,description',
      '2026-10-04,8.50,Market,Household staples',
      '2026-10-04,8.50,Market,Household staples',
      '2026-10-04,8.50,Market,Snacks',
    ].join('\n'), categories, []);
    expect(preview.map((row) => row.duplicateOf)).toEqual([null, 'csv-row-2', null]);
  });

  it('rejects a file without required columns', () => {
    expect(() => previewTransactionCsv('merchant\nCafe', categories, [])).toThrow('missing required columns: date, amount');
  });

  it('exports only provided records and safely quotes user text', () => {
    const transaction: Transaction = {
      id: 't', user_id: 'u', card_id: null, category_id: 'food', amount_minor: 12_500, currency: 'INR',
      transaction_type: 'expense', merchant: 'Cafe, North', description: '"Great" coffee', occurred_at: '2026-10-02T12:00:00+05:30',
      source: 'manual', is_demo: false, recurring: false, spend_channel: 'unknown',
    };
    const workspace = { categories, cards: [] } as unknown as WorkspaceData;
    const csv = exportTransactionsCsv([transaction], workspace);
    expect(csv).toContain('"Cafe, North"');
    expect(csv).toContain('""Great"" coffee"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
