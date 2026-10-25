export function transactionInSelectedScope(rowMonth: string, selectedMonth: string, allMonths: boolean) {
  return allMonths || rowMonth === selectedMonth;
}
