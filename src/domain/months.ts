export function monthOptions(currentMonth: string, selectedMonth = currentMonth) {
  const [year, month] = currentMonth.split('-').map(Number);
  const options = Array.from({ length: 25 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  if (!options.includes(selectedMonth)) options.push(selectedMonth);
  return [...new Set(options)].sort((a, b) => b.localeCompare(a));
}
