# Frontend Interview: People Picker (Autocomplete)

Welcome! In this exercise you'll build a **people picker**, the multi-select autocomplete
you see in the "To:" field of an email client or when adding people to a Slack channel.

- ⏱ **Time:** ~75 minutes (setup included)
- 🧰 **Stack:** React + TypeScript (scaffold it yourself, see below)
- 🌐 **Resources:** You may use docs (MDN, react.dev, WAI-ARIA APG) and Google. AI assistants and
  autocomplete/combobox libraries (Downshift, react-select, MUI Autocomplete, Headless UI, etc.) are
  **not** allowed. General utilities are fine if you can explain why you'd use them.
- 🗣 **Think out loud.** We care about how you reason about trade-offs as much as the final code.
  It's fine not to finish every part.

---

## 1. Setup (target: ≤ 10 min)

**Prerequisites:** Node 18+ and git.

```bash
# 1. Clone the repo
git clone <REPO_URL> autocomplete-interview
cd autocomplete-interview

# 2. Start the mock API (no npm install needed; it has zero dependencies)
cd server
npm start              # http://localhost:4000
```

Leave the server running and open a **second terminal**:

```bash
# 3. From the repo root, scaffold a React + TypeScript app into ./client
npm create vite@latest client -- --template react-ts
cd client
npm install
npm run dev            # http://localhost:5173
```

> Create React App is deprecated, so we use Vite. If you prefer another setup (Next.js, your own
> webpack config, ...), that's fine. Just be ready to explain your choice.

You're set up when the Vite page loads in the browser and this command returns JSON:

```bash
curl "http://localhost:4000/api/people?q=ale&limit=5"
```

---

## 2. The API

The server watches your requests. Its terminal logs every request with its status and latency.

### `GET /api/people?q=<query>&limit=<n>&offset=<n>`

| Param    | Default | Notes                                    |
| -------- | ------- | ---------------------------------------- |
| `q`      | `""`    | Search text. An empty query returns no results. |
| `limit`  | `10`    | 1–50                                     |
| `offset` | `0`     | For pagination                           |

```jsonc
// 200 OK
{
  "items": [
    {
      "id": "u_0759",
      "name": "Alex Baker",
      "email": "alex.baker@example.com",
      "title": "Product Designer",
      "department": "Design",
      "avatarColor": "#d97706"
    }
  ],
  "total": 38,
  "nextOffset": 10      // null when there are no more results
}

// 500 Internal Server Error (happens randomly, about 10% of requests)
{ "error": "Internal Server Error", "message": "..." }
```

### `GET /api/people/:id`

Returns one person, or `404`.

### Server behaviour (this is intentional)

The server is built to behave like a real production network:

- Latency is **random, from about 100 to 2400 ms**. Short queries take longer.
- About **10% of requests fail** with a `500` error.
- Matching ignores case and diacritics (`jose` matches `José`), and works on name or email.

To debug without the chaos, start the server with `CHAOS=0 npm start`
(on PowerShell: `$env:CHAOS=0; npm start`). Your final solution should still work **with chaos on**.

---

## 3. The Task

Work through the parts **in order**. Each part builds on the previous one. Before you move on,
make sure the current part works and the code is something you'd be OK putting in a PR.

### Part 1: Basic autocomplete (target: ~15 min)

- A text input. As the user types, fetch matching people from the API and show them in a
  dropdown below the input.
- Each result shows the person's **name**, **email** and **title**, plus an avatar circle
  with their initials in `avatarColor`.
- Clicking a result selects that person. For now, show the selected person somewhere on the page.

### Part 2: Make it production-ready (target: ~20 min)

- **Don't spam the API.** Typing "alexandra" should not send 9 requests.
- **Stale results must never be shown.** Type `a`, wait a moment, then quickly type `lex`. The
  results must match `alex`, not `a`, even if the `a` response arrives last.
- Show distinct **loading**, **empty** ("No people match "xyz""), and **error** states.
  When there's an error, the user should be able to recover (for example, a retry button, or
  retrying when they keep typing).
- **Highlight** the matching part of each name. Watch out for names containing characters
  such as `(`, `+`, `$`, `[` or `*`.

### Part 3: Keyboard & accessibility (target: ~15 min)

- `↓` / `↑` move the active option (decide what happens at the ends of the list).
- `Enter` selects the active option. `Escape` closes the dropdown.
- The dropdown closes when focus leaves the component or the user clicks outside it.
- Screen readers must be able to use it. Follow the
  [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
  (roles, `aria-expanded`, `aria-activedescendant`, ...).
- The active option stays scrolled into view.

### Part 4: The twist, multi-select (target: ~15 min)

Turn the single-select autocomplete into a **people picker**:

- Selected people appear as **chips** inside the input area, before the text cursor.
- Each chip has a remove button (×) that works with a mouse and with a keyboard.
- People who are already selected **don't appear** in the results.
- Pressing `Backspace` in an **empty** input removes the last chip.
- The input clears and keeps focus after each selection.
- Allow at most **5** people. Make it clear to the user when they hit the limit.

### Stretch goals (pick any, or discuss how you would do them)

- **Caching:** typing `ale` → `alex` → `ale` should not fetch `ale` twice.
- **Pagination / infinite scroll** with `offset` and `nextOffset`.
- Pull the reusable logic out of the people-specific UI (for example, a generic `useCombobox` hook or
  `<Autocomplete<T>>` component). What is the API surface?
- **Tests** (Vitest + React Testing Library) for the trickiest behaviour.
- Rendering 10,000 results: what would you change?
- Paste "alice@x.com, bob@y.com" and resolve it into chips.

---

## 4. Wrap-up discussion (last ~10 min)

Be ready to talk through:

1. What would you change before shipping this to millions of users?
2. How did you handle race conditions? What alternatives did you consider?
3. Where should debouncing live, and how did you pick the delay?
4. How would you test this?
5. What would change if this component lived in a shared design-system library?

Good luck! 🚀
