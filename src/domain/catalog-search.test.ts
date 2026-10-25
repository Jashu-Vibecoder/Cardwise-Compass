import { describe, expect, it } from 'vitest';
import { searchCatalogRecords } from './catalog-search';
import type { CatalogCard } from './types';

const card = (id: string, issuer_name: string, card_name: string, aliases: string[]): CatalogCard => ({
  id, issuer_name, card_name, category: 'Cashback', aliases, official_product_url: null,
  source_url: null, verification_status: 'unverified', last_verified_at: null,
  benefit_summary: null, annual_fee_minor: null, joining_fee_minor: null,
});

describe('catalogue card search', () => {
  const catalog = [
    card('millennia', 'HDFC Bank', 'Millennia', ['Millennia Credit Card']),
    card('sbi', 'SBI Card', 'Cashback Card', ['CASHBACK SBI Card']),
  ];

  it('matches all words across issuer, product name, and aliases', () => {
    expect(searchCatalogRecords('HDFC millennia', catalog).map((item) => item.id)).toEqual(['millennia']);
    expect(searchCatalogRecords('cashback sbi', catalog).map((item) => item.id)).toEqual(['sbi']);
  });

  it('returns a stable sorted, bounded list and an empty result for blank input', () => {
    expect(searchCatalogRecords(' ', catalog)).toEqual([]);
    expect(searchCatalogRecords('card', catalog, 1)).toHaveLength(1);
    expect(searchCatalogRecords('card', catalog)[0].id).toBe('millennia');
  });
});
