/**
 * Leaderboard API for younghyeonpark.github.io
 *
 * Replaces the previous arrangement, where the browser held the storage
 * credential and POSTed the entire score list. Anyone reading the page source
 * could rewrite or erase the board.
 *
 * Here the browser proposes a single entry and the server owns the merge, so
 * the worst a forged request can do is insert one bogus row.
 *
 *   GET  /scores/:slug   -> { game, entries: [{ name, score, date }] }
 *   POST /scores/:slug   -> body { name, score } -> same shape, after merging
 *
 * This cannot prove a score was actually earned; no anonymous public
 * leaderboard can. See README.md for what it does and does not stop.
 */

/**
 * Per-game score invariants, derived from the scoring maths in script.js:
 *   Photon Runner    distance accumulator, any integer
 *   Slot Gate 3D     roadsScore = clearedGateCount * 100
 *   Schrodinger Cat  += 500 per treat collected
 *
 * `max` only rejects the physically absurd. Photon Runner's ceiling is loose
 * because its score grows exponentially (the score/1500 feedback term), so a
 * tight bound would punish a genuinely long run.
 */
const GAMES = {
  runner:      { name: 'Photon Runner',   step: 1,   max: 5000000 },
  slotgate:    { name: 'Slot Gate 3D',    step: 100, max: 1000000 },
  schrodinger: { name: 'Schrödinger Cat', step: 500, max: 1000000 },
};

const MAX_ENTRIES = 20;
const MAX_BODY_BYTES = 512;
const MAX_NAME_LENGTH = 12;
const RATE_LIMIT_MAX = 5;       // submissions per window, per IP, per game
const RATE_LIMIT_WINDOW = 60;   // seconds (KV's expirationTtl minimum)

const DEFAULT_ORIGINS = 'https://younghyeonpark.github.io';

function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
  );
}

/**
 * Browsers set Origin themselves and page scripts cannot forge it, so this
 * stops another site from driving a visitor's browser at this API. It does
 * nothing against a direct client such as curl, which can send any value.
 */
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const headers = { 'Vary': 'Origin' };
  if (origin && allowedOrigins(env).has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(status, body, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

/**
 * Strips control characters and collapses whitespace. Markup characters are
 * deliberately preserved: mangling them would break names like "<3" while
 * giving false comfort. Consumers must escape on render (the site uses
 * textContent, never innerHTML).
 */
function cleanName(raw) {
  const text = String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return text || 'Anonymous';
}

function readEntries(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(row => row && typeof row === 'object' && Number.isFinite(Number(row.score)))
    .map(row => ({
      name: cleanName(row.name),
      score: Math.floor(Number(row.score)),
      date: /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : '',
    }));
}

function sortEntries(entries) {
  // Ties go to whoever got there first.
  return entries.sort((a, b) => (b.score - a.score) || String(a.date).localeCompare(String(b.date)));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function handleGet(slug, game, request, env) {
  const entries = readEntries(await env.LEADERBOARD.get(`lb:${slug}`));
  return json(200, { game: game.name, entries: sortEntries(entries).slice(0, MAX_ENTRIES) }, request, env);
}

async function handlePost(slug, game, request, env) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
    return json(415, { error: 'Expected application/json.' }, request, env);
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return json(413, { error: 'Body too large.' }, request, env);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (err) {
    return json(400, { error: 'Malformed JSON.' }, request, env);
  }
  if (!payload || typeof payload !== 'object') {
    return json(400, { error: 'Expected a JSON object.' }, request, env);
  }

  const score = Number(payload.score);
  // isSafeInteger, not isInteger: 9e18 has no fractional part but cannot be
  // compared or stored reliably, and it is a malformed value, not a high score.
  if (!Number.isSafeInteger(score) || score < 0) {
    return json(400, { error: 'Score must be a non-negative integer.' }, request, env);
  }
  // The game's own arithmetic can only produce multiples of `step`, so any
  // other value was not produced by playing.
  if (score % game.step !== 0) {
    return json(422, { error: `${game.name} scores are always multiples of ${game.step}.` }, request, env);
  }
  if (score > game.max) {
    return json(422, { error: 'Score exceeds what the game can produce.' }, request, env);
  }

  // Charged only after the request is structurally valid, so junk traffic
  // cannot burn through the KV write quota.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateKey = `rl:${slug}:${ip}`;
  const hits = Number(await env.LEADERBOARD.get(rateKey)) || 0;
  if (hits >= RATE_LIMIT_MAX) {
    return json(429, { error: 'Too many submissions. Try again shortly.' }, request, env);
  }
  await env.LEADERBOARD.put(rateKey, String(hits + 1), { expirationTtl: RATE_LIMIT_WINDOW });

  const key = `lb:${slug}`;
  const entries = readEntries(await env.LEADERBOARD.get(key));
  // The date is server-side: a client has no business stamping it.
  entries.push({ name: cleanName(payload.name), score, date: today() });

  const merged = sortEntries(entries).slice(0, MAX_ENTRIES);
  await env.LEADERBOARD.put(key, JSON.stringify(merged));

  return json(200, { game: game.name, entries: merged }, request, env);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const origin = request.headers.get('Origin');
    if (origin && !allowedOrigins(env).has(origin)) {
      return json(403, { error: 'Origin not allowed.' }, request, env);
    }

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/scores\/([a-z0-9-]{1,32})\/?$/);
    if (!match) {
      return json(404, { error: 'Not found. Use /scores/:game.' }, request, env);
    }

    const slug = match[1];
    const game = GAMES[slug];
    if (!game) {
      return json(404, { error: 'Unknown game.', known: Object.keys(GAMES) }, request, env);
    }

    if (request.method === 'GET')  return handleGet(slug, game, request, env);
    if (request.method === 'POST') return handlePost(slug, game, request, env);

    return json(405, { error: 'Method not allowed.' }, request, env);
  },
};
