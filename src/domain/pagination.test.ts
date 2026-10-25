import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from './pagination';

describe('transaction pagination', () => {
  it('loads every page, including a final partial page', async () => {
    const source = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const requested: Array<[number, number]> = [];
    const rows = await fetchAllPages(async (start, end) => {
      requested.push([start, end]);
      return source.slice(start, end + 1);
    }, 3);
    expect(rows).toEqual(source);
    expect(requested).toEqual([[0, 2], [3, 5], [6, 8]]);
  });

  it('stops after an empty first page', async () => {
    const fetchPage = vi.fn(async () => [] as string[]);
    expect(await fetchAllPages(fetchPage, 2)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
