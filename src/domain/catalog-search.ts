import type { CatalogCard } from './types';

export function searchCatalogRecords(query: string, catalog: CatalogCard[], limit = 12) {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return catalog
    .filter((card) => {
      const index = [card.issuer_name, card.card_name, ...card.aliases, card.category ?? ''].join(' ').toLocaleLowerCase();
      return tokens.every((token) => index.includes(token));
    })
    .sort((left, right) => left.issuer_name.localeCompare(right.issuer_name) || left.card_name.localeCompare(right.card_name))
    .slice(0, limit);
}
