# Leaderboard API

A Cloudflare Worker that stores the arcade scores for `younghyeonpark.github.io`.

## Why this exists

The site is on GitHub Pages, which serves static files and nothing else. There is
nowhere for a secret to live, so the previous design put the storage credential in
`script.js` and let the browser POST the **entire** score list:

```js
await fetch(bucketUrl, { method: 'POST', body: JSON.stringify(list) });
```

Anyone reading the page source could therefore rewrite or erase the board with one
request. This Worker takes over that job: the browser proposes **one entry**, and
the server does the merge.

## Endpoints

| Method | Path             | Body               | Returns |
| ------ | ---------------- | ------------------ | ------- |
| `GET`  | `/scores/:slug`  | —                  | `{ game, entries: [{ name, score, date }] }` |
| `POST` | `/scores/:slug`  | `{ name, score }`  | same shape, after merging |

Slugs: `runner`, `slotgate`, `schrodinger`.

## What it checks

**Score invariants.** Each game's arithmetic can only produce certain values, so
anything else was not produced by playing:

| Game | Source | Valid scores | Ceiling |
| ---- | ------ | ------------ | ------- |
| Photon Runner | distance accumulator | any integer | 5,000,000 |
| Slot Gate 3D | `clearedGateCount * 100` | multiples of 100 | 1,000,000 |
| Schrödinger Cat | `+= 500` per treat | multiples of 500 | 1,000,000 |

Photon Runner's ceiling is deliberately loose: its score compounds (the
`score / 1500` feedback term), so a long run reaches millions and a tight bound
would reject honest players.

**Shape.** Method, content type, body size (512 B), integer range, name length.
Names are stripped of control characters and capped at 12 characters; the date is
stamped server-side and a client-supplied one is ignored.

**Origin.** Requests from origins outside `ALLOWED_ORIGINS` are refused. Browsers
set `Origin` themselves and page scripts cannot forge it, so this stops another
site from driving a visitor's browser at this API. It does nothing against `curl`,
which can send any header it likes — do not mistake it for authentication.

**Rate.** Five submissions per minute per IP per game, counted only after a request
is structurally valid so junk traffic cannot burn the KV write quota.

**Blast radius.** The board is merged server-side and truncated to the top 20. A
forged request can insert one bogus row; it cannot replace or delete the board.

## What it does not stop

Someone who opens devtools and submits a plausible score for a game they did not
play will succeed. No anonymous public leaderboard can prevent that — proving a
score was earned needs a replay the server can re-simulate, which is far more
machinery than this is worth.

If that ever matters, the next steps in order of cost are: Cloudflare Turnstile on
submit, a short-lived session token issued at game start and checked against
elapsed time, then full replay validation.

## Known limits

- **Workers KV is eventually consistent and has no atomic read-modify-write.** Two
  submissions landing in the same instant can lose one, and the rate limiter is
  approximate. Fine at portfolio traffic. If it ever matters, move the merge into a
  Durable Object, which gives you real serialisation.
- Free plan headroom: 100,000 Worker requests/day, 100,000 KV reads/day, 1,000 KV
  writes/day. A write is one score submission.

## Deploy

```bash
cd leaderboard-worker
npm install -g wrangler        # or use npx in place of wrangler below
wrangler login
```

Create the KV namespace and put the returned id into `wrangler.toml`:

```bash
wrangler kv namespace create LEADERBOARD
```

> On older wrangler the command is `wrangler kv:namespace create LEADERBOARD`.

Then deploy:

```bash
wrangler deploy
```

Wrangler prints the URL, something like `https://yp-leaderboard.<account>.workers.dev`.

## Wire up the site

Open `script.js`, find `LEADERBOARD_API` near the leaderboard section, and set it:

```js
const LEADERBOARD_API = 'https://yp-leaderboard.<account>.workers.dev';
```

While it is left empty the site runs in local-only mode: scores persist in
`localStorage` and no network calls are made. Nothing breaks before you deploy.

## Test

```bash
npm test
```

Runs the Worker against an in-memory KV stub and asserts the accept/reject
behaviour — routing, origin handling, the per-game score invariants, malformed
input, name sanitising, server-side merge and truncation, and rate limiting.

## Retiring the old backend

The previous kvdb.io bucket id is published in this repository's history, so it
cannot be secured by editing a file. Once this Worker is live, delete the bucket
from your own machine:

```bash
curl -XDELETE https://kvdb.io/<bucket-id>
```

There is nothing to migrate: all three keys returned `404`, so no scores were ever
stored.
