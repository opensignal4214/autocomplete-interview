import { useCallback, useEffect, useState } from 'react';
import { searchPeople, type Person, type SearchResponse } from '../api/people';
import { LruCache } from '../utils/lruCache';
import { useDebouncedValue } from './useDebouncedValue';

export type SearchState =
  | { status: 'idle' }
  // While loading we keep the previous items so the list doesn't flash empty between keystrokes.
  | { status: 'loading'; query: string; items: Person[] }
  | { status: 'success'; query: string; items: Person[]; total: number }
  | { status: 'error'; query: string; items: Person[]; error: Error };

/** The last request that finished. Everything else is derived from this during render. */
type Settled =
  | { query: string; attempt: number; ok: true; items: Person[]; total: number }
  | { query: string; attempt: number; ok: false; error: Error };

// Shared across hook instances. Bounded so it can't grow forever.
// Errors are never cached, so a retry always goes to the network.
export const searchCache = new LruCache<string, SearchResponse>(100);
const cacheKey = (query: string, limit: number) => `${query.toLowerCase()}|${limit}`;

interface Options {
  debounceMs?: number;
  limit?: number;
}

export function usePeopleSearch(query: string, { debounceMs = 250, limit = 10 }: Options = {}) {
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, debounceMs);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!debouncedQuery || searchCache.get(cacheKey(debouncedQuery, limit))) return;

    // Debounce cuts down how many requests we send, but it doesn't stop an older,
    // slower response from arriving after a newer one. Aborting in the cleanup
    // makes sure only the latest request can ever update state.
    const controller = new AbortController();

    searchPeople(debouncedQuery, { limit, signal: controller.signal })
      .then((res) => {
        searchCache.set(cacheKey(debouncedQuery, limit), res);
        setSettled({ query: debouncedQuery, attempt, ok: true, items: res.items, total: res.total });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return; // Superseded or unmounted: not a real error.
        const err = error instanceof Error ? error : new Error(String(error));
        setSettled({ query: debouncedQuery, attempt, ok: false, error: err });
      });

    return () => controller.abort();
  }, [debouncedQuery, limit, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const state = deriveState(debouncedQuery, limit, attempt, settled);

  // The user has typed past what we've searched for (debounce pending), or a request is in flight.
  const isPending = state.status === 'loading' || (trimmed !== '' && trimmed !== debouncedQuery);

  return { state, isPending, retry };
}

function deriveState(query: string, limit: number, attempt: number, settled: Settled | null): SearchState {
  if (!query) return { status: 'idle' };

  const cached = searchCache.get(cacheKey(query, limit));
  if (cached) return { status: 'success', query, items: cached.items, total: cached.total };

  if (settled?.query === query && settled.attempt === attempt) {
    return settled.ok
      ? { status: 'success', query, items: settled.items, total: settled.total }
      : { status: 'error', query, items: [], error: settled.error };
  }

  return { status: 'loading', query, items: settled?.ok ? settled.items : [] };
}
