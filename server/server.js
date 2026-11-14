// Mock "People Directory" API. Zero dependencies — requires Node 18+.
//
//   node server.js                 # default: realistic-ish latency + 10% failures
//   CHAOS=0 node server.js         # no latency, no failures (for debugging)
//
// Env vars: PORT (4000), LATENCY_MIN_MS (100), LATENCY_MAX_MS (1500), FAILURE_RATE (0.1), CHAOS (1)

import http from 'node:http';
import people from './data.js';

const PORT = Number(process.env.PORT ?? 4000);
const CHAOS = process.env.CHAOS !== '0';
const LATENCY_MIN = CHAOS ? Number(process.env.LATENCY_MIN_MS ?? 100) : 0;
const LATENCY_MAX = CHAOS ? Number(process.env.LATENCY_MAX_MS ?? 1500) : 0;
const FAILURE_RATE = CHAOS ? Number(process.env.FAILURE_RATE ?? 0.1) : 0;
const MAX_LIMIT = 50;

let requestCount = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Ranking: name prefix > word-prefix in name > substring of name > substring of email.
function score(person, q) {
  const name = normalize(person.name);
  const email = person.email.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.split(/[\s\-'.()[\]]+/).some((w) => w.startsWith(q))) return 1;
  if (name.includes(q)) return 2;
  if (email.includes(q)) return 3;
  return -1;
}

function search(rawQuery) {
  const q = normalize(rawQuery.trim());
  if (!q) return [];
  return people
    .map((p) => ({ p, s: score(p, q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name))
    .map((x) => x.p);
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = ++requestCount;
  const started = Date.now();

  if (url.pathname === '/api/health') return send(res, 200, { ok: true });

  if (url.pathname === '/api/people' && req.method === 'GET') {
    const q = url.searchParams.get('q') ?? '';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 10) || 10, 1), MAX_LIMIT);
    const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);

    // Shorter queries are "more expensive" -> slower. This makes out-of-order
    // responses very likely when typing quickly ("a" resolves after "ali").
    const base = LATENCY_MIN + Math.random() * (LATENCY_MAX - LATENCY_MIN);
    const delay = CHAOS ? Math.round(base * (q.length <= 1 ? 1.6 : q.length === 2 ? 1.2 : 0.8)) : 0;
    await sleep(delay);

    if (Math.random() < FAILURE_RATE) {
      log(id, q, 500, Date.now() - started);
      return send(res, 500, { error: 'Internal Server Error', message: 'Random failure (FAILURE_RATE)' });
    }

    const all = search(q);
    const items = all.slice(offset, offset + limit);
    const nextOffset = offset + limit < all.length ? offset + limit : null;
    log(id, q, 200, Date.now() - started, `${items.length}/${all.length}`);
    return send(res, 200, { items, total: all.length, nextOffset });
  }

  const match = url.pathname.match(/^\/api\/people\/([\w-]+)$/);
  if (match && req.method === 'GET') {
    const person = people.find((p) => p.id === match[1]);
    return person ? send(res, 200, person) : send(res, 404, { error: 'Not Found' });
  }

  send(res, 404, { error: 'Not Found' });
});

function log(id, q, status, ms, extra = '') {
  const color = status === 200 ? '\x1b[32m' : '\x1b[31m';
  console.log(`#${String(id).padStart(4)} ${color}${status}\x1b[0m ${String(ms).padStart(5)}ms  q=${JSON.stringify(q)} ${extra}`);
}

server.listen(PORT, () => {
  console.log(`People API listening on http://localhost:${PORT}  (${people.length} people)`);
  console.log(
    CHAOS
      ? `Chaos ON: latency ${LATENCY_MIN}-${LATENCY_MAX}ms, failure rate ${FAILURE_RATE * 100}%  (CHAOS=0 to disable)`
      : 'Chaos OFF: instant responses, no failures',
  );
  console.log('Try: curl "http://localhost:' + PORT + '/api/people?q=ale&limit=5"\n');
});
