export function clearRemovedCardLinks<T extends { card_id: string | null }>(transactions: T[], cardId: string) {
  return transactions.map((transaction) => transaction.card_id === cardId ? { ...transaction, card_id: null } : transaction);
}
