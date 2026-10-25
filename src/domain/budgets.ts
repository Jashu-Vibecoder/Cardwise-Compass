export function hasBudgetConflict<T extends { id: string; period_start: string; category_id: string | null }>(
  budgets: T[],
  candidate: { period_start: string; category_id: string | null },
  editingId?: string,
) {
  return budgets.some((budget) => budget.id !== editingId
    && budget.period_start === candidate.period_start
    && budget.category_id === candidate.category_id);
}
