export async function fetchAllPages<T>(fetchPage: (start: number, end: number) => Promise<T[]>, pageSize = 1_000) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('Page size must be a positive integer.');
  const rows: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const page = await fetchPage(start, start + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
