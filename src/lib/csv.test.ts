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
    expect(preview[0].duplicateOf).toBe('existing');
    expect(preview[1].input).toBeNull();
    expect(preview[1].errors).toHaveLength(1);
    expect(preview[2].input?.source).toBe('csv_import');
    expect(preview[2].input?.amount_minor).toBe(850);
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
