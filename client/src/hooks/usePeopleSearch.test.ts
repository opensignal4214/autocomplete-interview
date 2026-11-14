import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPeople, type SearchResponse } from '../api/people';
import { deferred, person } from '../test/fixtures';
import { searchCache, usePeopleSearch } from './usePeopleSearch';

vi.mock('../api/people', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/people')>()),
  searchPeople: vi.fn(),
}));
const mockSearch = vi.mocked(searchPeople);

const response = (...names: string[]): SearchResponse => ({ items: names.map((n) => person(n)), total: names.length, nextOffset: null });

describe('usePeopleSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchCache.clear();
    mockSearch.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('debounces: only the final query hits the API', async () => {
    mockSearch.mockResolvedValue(response('Alex Kim'));
    const { rerender } = renderHook(({ q }) => usePeopleSearch(q, { debounceMs: 250 }), { initialProps: { q: '' } });

    for (const q of ['a', 'al', 'ale', 'alex']) {
      rerender({ q });
      await act(() => vi.advanceTimersByTimeAsync(100));
    }
    await act(() => vi.advanceTimersByTimeAsync(250));

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('alex', expect.anything());
  });

  it('never shows a stale response that arrives after a newer one', async () => {
    const slowA = deferred<SearchResponse>();
    const fastAlex = deferred<SearchResponse>();
    mockSearch.mockImplementation((q) => (q === 'a' ? slowA.promise : fastAlex.promise));

    const { result, rerender } = renderHook(({ q }) => usePeopleSearch(q, { debounceMs: 0 }), { initialProps: { q: 'a' } });
    await act(() => vi.advanceTimersByTimeAsync(0)); // request for "a" is in flight

    rerender({ q: 'alex' });
    await act(() => vi.advanceTimersByTimeAsync(0)); // request for "alex" is in flight

    await act(async () => fastAlex.resolve(response('Alex Kim')));
    await act(async () => slowA.resolve(response('Ada Lovelace'))); // the stale response arrives last

    expect(result.current.state).toMatchObject({ status: 'success', query: 'alex' });
    expect(result.current.state.status === 'success' && result.current.state.items.map((p) => p.name)).toEqual(['Alex Kim']);
    // The first request was aborted when the query changed.
    expect(mockSearch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('serves repeat queries from the cache', async () => {
    mockSearch.mockImplementation(async (q) => response(`${q} result`));
    const { rerender } = renderHook(({ q }) => usePeopleSearch(q, { debounceMs: 0 }), { initialProps: { q: 'ale' } });
    await act(() => vi.advanceTimersByTimeAsync(0));
    rerender({ q: 'alex' });
    await act(() => vi.advanceTimersByTimeAsync(0));
    rerender({ q: 'ale' });
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(mockSearch.mock.calls.map(([q]) => q)).toEqual(['ale', 'alex']);
  });

  it('exposes errors and recovers on retry', async () => {
    mockSearch.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(response('Alex Kim'));
    const { result } = renderHook(() => usePeopleSearch('alex', { debounceMs: 0 }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.status).toBe('error');

    act(() => result.current.retry());
    expect(result.current.state.status).toBe('loading');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.status).toBe('success');
  });
});
