# Interviewer Guide (spoilers ⚠️)

> If you're practicing as the candidate, **don't read this until you've finished the exercise.**
> Then use it to score yourself honestly. A reference solution is on the `solution` branch.

## Timeline (75 min)

| Time    | Phase                      | What to watch                                                           |
| ------- | -------------------------- | ----------------------------------------------------------------------- |
| 0–10    | Setup                      | Comfort with git, npm, Vite, two terminals. Do they read the README?    |
| 10–25   | Part 1                     | Component structure, typing the API response, fetch hygiene             |
| 25–45   | Part 2                     | **Main senior signal:** debounce, race conditions, state modelling      |
| 45–60   | Part 3                     | Keyboard handling, ARIA knowledge, focus management                     |
| 60–70   | Part 4                     | Adapting the design to new requirements: does the code bend or break?   |
| 70–75   | Discussion                 | Trade-offs, testing, scaling                                            |

If setup takes more than 15 minutes, help them so the session doesn't stall, and make a note of it.

## Traps built into the server and data

| Trap | What it catches |
| --- | --- |
| Random latency from 100 to 2400 ms; short queries take longer | **Out-of-order responses.** Without cancellation or ignoring stale responses, the results for `a` overwrite the results for `alex`. |
| 10% random `500`s | Missing `res.ok` check (`fetch` doesn't throw on a 500). No error state, or the user can't recover from one. |
| `C++ Build Bot (CI)`, `Dr. Strange $pecial*`, `[Deactivated] Pat Morgan` | `new RegExp(query)` without escaping throws an error or highlights the wrong text. |
| `José Álvarez`, `Zoë`, `Łukasz` | The server matches `jose` to `José`, but a naive client-side `indexOf` doesn't find it, so nothing is highlighted. Strong candidates notice this and either accept it or handle it with `normalize('NFD')`. |
| Two people named `Alex Kim` | Using `key={name}` produces React key warnings and bugs when chips are removed. |
| Very long name | The chip or row needs truncation (`text-overflow: ellipsis`). |
| Empty `q` returns `[]` | Do they skip the request entirely for blank or whitespace-only input? |

## Rubric

Score each area 1–4. A **senior hire** is usually at least 3 in most areas, with no area at 1.

### 1. Async correctness (weight: high)

- **1:** Fetches on every keystroke. Stale results show up. Ignores `res.ok`.
- **2:** Debounces, but has a race condition, or loading state flickers or gets stuck.
- **3:** Debounce plus `AbortController` (or a request-id/"ignore" flag) inside a `useEffect` cleanup.
  Checks `res.ok`. Has an error state.
- **4:** All of the above, and can explain *why* debounce alone doesn't fix races. Treats
  `AbortError` as different from real errors. Has a cache. Handles a retry cleanly. Doesn't set state after unmount.

### 2. State modelling & React fundamentals (weight: high)

- **1:** Many `useState`s that contradict each other (`loading && error` both true). Derived data
  stored in state.
- **2:** Works, but logic is spread out. `useEffect`s chain off each other.
- **3:** Clear status model (`idle | loading | success | error`, or a discriminated union).
  Derives values such as `filteredResults` and `isOpen` instead of syncing them.
- **4:** Separates concerns cleanly (data hook / combobox behaviour / presentation). Uses
  `useId` for ARIA ids. Can explain re-render costs and when `useMemo`/`useCallback` actually matter.

### 3. Accessibility & keyboard UX (weight: medium-high)

- **1:** Mouse only. `<div onClick>` rows.
- **2:** Arrow keys and Enter work, but there's no ARIA, or focus jumps around.
- **3:** `role="combobox"` on the input, `aria-expanded`, `aria-controls`, `role="listbox"`/`option`,
  `aria-activedescendant`, `aria-selected`. Escape works. Uses `onMouseDown` + `preventDefault`
  so clicking an option doesn't blur the input before the click lands.
- **4:** Announces result counts and loading in a polite live region. Chip remove buttons have accessible names
  ("Remove Alex Kim"). Resets the active index when results change. Uses `scrollIntoView({ block: 'nearest' })`.

### 4. TypeScript (weight: medium)

- **1:** `any` everywhere.
- **2:** Has types, but casts `res.json()` without thinking about it.
- **3:** Types for `Person` and `SearchResponse`. Typed event handlers. No `any`.
- **4:** Generic component/hook (`<T,>`). Discriminated union for status. Mentions runtime validation
  (zod) at the network boundary as a trade-off.

### 5. Adaptability: Part 4 (weight: medium)

- Does adding multi-select need a rewrite, or is it small and contained?
- Do they filter out selected people *after* fetching? (Correct. The server doesn't know about the
  selection.) Do they notice that this can leave fewer than `limit` results?
- Is the 5-person limit enforced *and* communicated (disabled input, helper text, `aria-describedby`)?

### 6. Communication & process (weight: high)

- Do they clarify ambiguous requirements (wrap-around at the ends of the list? min query length?)
- Do they make small, working steps and test in the browser as they go?
- Do they notice the server log and use it to check their debounce?
- Do they describe trade-offs honestly instead of over-engineering?

## Probing questions

Ask these when there's a natural opening:

- "Debounce or throttle here? Why?"
- "You debounced. Why do you still need `AbortController`?" (Debounce reduces requests but
  doesn't stop slow responses arriving in the wrong order.)
- "What happens if the component unmounts mid-request?"
- "Your cache grows forever. Is that a problem? How would you bound it?" (LRU, TTL, or React Query.)
- "Would you use React Query / SWR / `use()` in production? What would they give you here?"
- "How would a screen reader user know there are 7 results?"
- "Why `onMouseDown` instead of `onClick` on options?"
- "Where would you put `key`s, and why is `name` wrong?"
- "How would you test the race condition deterministically?" (Fake timers + controlled promises / MSW with delays.)
- "Design-system version: controlled or uncontrolled? What props?" (`value`/`onChange`,
  `renderOption`, `getOptionKey`, `getOptionLabel`, `loadOptions`, async vs. sync.)
- "The list has 10,000 items. What breaks first?" (DOM size → virtualization; `aria-setsize`/`aria-posinset`.)

## Red flags

- Copies a combobox implementation from memory or the web without understanding it.
- Can't explain their own `useEffect` dependency array.
- Silences lint warnings (`// eslint-disable-next-line react-hooks/exhaustive-deps`) without a reason.
- Never opens the browser devtools or the network tab.
- Gets defensive when a bug is pointed out.

## Green flags

- Reproduces the race condition *first*, then fixes it.
- Writes a tiny `useDebouncedValue` hook rather than pulling in lodash, and can explain both options.
- Keeps the UI responsive: shows previous results (dimmed) while loading instead of flashing empty.
- Leaves `// TODO` notes for things they'd do with more time.
