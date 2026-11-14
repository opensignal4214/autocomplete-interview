# Reference Solution (spoilers ⚠️)

This branch holds one strong answer to the exercise in [README.md](README.md). It isn't the only
good answer. The rubric is in [docs/INTERVIEWER_GUIDE.md](docs/INTERVIEWER_GUIDE.md).

```bash
cd server && npm start                         # terminal 1
cd client && npm install && npm run dev        # terminal 2 → http://localhost:5173
cd client && npm test                          # Vitest + React Testing Library
```

## Layout

```
client/src/
  api/people.ts               Types + fetch wrapper (checks res.ok, passes AbortSignal through)
  hooks/useDebouncedValue.ts  10-line debounce hook, no lodash
  hooks/usePeopleSearch.ts    Debounce + abort + LRU cache + retry. Status is derived, not synced
  utils/lruCache.ts           Bounded cache using Map insertion order
  components/Highlight.tsx    Escape-proof, diacritic-aware highlighting (no RegExp)
  components/PeoplePicker.tsx ARIA combobox + chips + keyboard handling
  components/Avatar.tsx
```

## Key decisions (and what to say about them)

**Race conditions.** Debouncing doesn't fix races: a slow `a` response can still arrive after
`alex`. Each request gets an `AbortController`, and the effect cleanup aborts it. Aborted requests
are ignored on purpose and never shown as errors. A "request id / ignore flag" works too. Aborting also
frees the connection.

**State is derived, not synced.** The hook stores only the *last settled result*
(`{ query, attempt, ok, items | error }`). It derives `idle`, `loading`, `success` and `error`
during render by comparing that result with the current query and attempt. This avoids calling `setState`
synchronously inside effects, and contradictory states (`loading && error`) can't happen.
In the same way, the picker stores `activeId` rather than `activeIndex`, so the highlighted
option survives the result list changing.

**No flash of empty.** While a new query loads, the previous results stay visible but dimmed
(`.listbox--stale`). "Searching…" only appears when there's nothing to show yet.

**Cache.** Successful responses go in an LRU cache (100 entries) keyed by `query|limit`. Errors are never
cached, so a retry always goes to the network. In production I'd reach for TanStack Query, which
gives you this plus deduping, stale-while-revalidate and devtools.

**Highlighting.** The highlighter folds case and diacritics the same way the server does, and keeps a
map from folded positions back to the original string. It uses `indexOf` rather than `new RegExp`, so
`c++`, `(ci` and `$pecial*` just work, and `jose` highlights `José`.

**Accessibility.** The input has `role="combobox"`, `aria-expanded`, `aria-controls`,
`aria-activedescendant` and `aria-autocomplete="list"`. The list uses `role="listbox"`/`option`
with `aria-selected`. IDs come from `useId`. A polite live region announces "N results available",
errors and "Searching…". Chip remove buttons have names like "Remove Alex Kim". The limit message
is wired up through `aria-describedby`. Options use `onMouseDown` with `preventDefault` so the input
never blurs mid-click.

**Multi-select.** People who are already selected are filtered out on the client (the server doesn't
know about the selection). The trade-off is that you can get fewer than `limit` results. With pagination
you'd top up from `nextOffset`. When the picker is full, the input becomes `readOnly` rather than
`disabled`, so Backspace still works to remove chips.

## Things deliberately left out (good discussion material)

- Pagination / infinite scroll with `nextOffset` and `aria-setsize`/`aria-posinset`
- Virtualization for very large lists
- Runtime validation of the API response (zod)
- Pasting comma-separated emails to create chips
- A generic `useCombobox<T>()` hook pulled out of `PeoplePicker`
- Visual regression / e2e tests (Playwright) against the real chaos server
