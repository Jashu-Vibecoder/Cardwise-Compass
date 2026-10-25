export function findWalletCardToUpdate<T extends { id: string }>(cards: T[], existingId?: string) {
  return existingId ? cards.find((card) => card.id === existingId) : undefined;
}
