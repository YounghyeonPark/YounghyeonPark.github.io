import fs from 'node:fs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'src', 'index.js'), 'utf8');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))).default;

const ORIGIN = 'https://younghyeonpark.github.io';

function makeEnv() {
  const store = new Map();
  return {
    ALLOWED_ORIGINS: ORIGIN,
    LEADERBOARD: {
      async get(k) { return store.has(k) ? store.get(k) : null; },
      async put(k, v) { store.set(k, v); },
    },
    _store: store,
  };
}

function req(method, path, { body, origin = ORIGIN, contentType = 'application/json', ip = '1.2.3.4' } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('CF-Connecting-IP', ip);
  return new Request('https://api.example.com' + path, {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

let pass = 0, fail = 0;
async function check(label, expectStatus, request, env, extra) {
  const res = await worker.fetch(request, env);
  let payload = null;
  try { payload = await res.clone().json(); } catch (e) { /* 204 */ }
  const okStatus = res.status === expectStatus;
  const okExtra = extra ? extra(payload, res) : true;
  if (okStatus && okExtra) { pass++; console.log(`  PASS  ${String(expectStatus).padEnd(3)} ${label}`); }
  else {
    fail++;
    console.log(`  FAIL  want ${expectStatus} got ${res.status}  ${label}`);
    if (payload) console.log('        payload:', JSON.stringify(payload).slice(0, 160));
  }
  return payload;
}

console.log('\n-- routing & method --');
{
  const env = makeEnv();
  await check('GET /scores/runner on empty store', 200, req('GET', '/scores/runner'), env,
    p => Array.isArray(p.entries) && p.entries.length === 0 && p.game === 'Photon Runner');
  await check('GET unknown game', 404, req('GET', '/scores/pacman'), env);
  await check('GET bad path', 404, req('GET', '/anything'), env);
  await check('DELETE rejected', 405, req('DELETE', '/scores/runner'), env);
  await check('OPTIONS preflight', 204, req('OPTIONS', '/scores/runner'), env);
}

console.log('\n-- origin --');
{
  const env = makeEnv();
  await check('foreign origin blocked', 403, req('GET', '/scores/runner', { origin: 'https://evil.example' }), env);
  const res = await worker.fetch(req('GET', '/scores/runner'), env);
  const acao = res.headers.get('Access-Control-Allow-Origin');
  if (acao === ORIGIN) { pass++; console.log('  PASS  200 allowed origin gets ACAO:', acao); }
  else { fail++; console.log('  FAIL  ACAO was', acao); }
  const res2 = await worker.fetch(req('GET', '/scores/runner', { origin: null }), env);
  const acao2 = res2.headers.get('Access-Control-Allow-Origin');
  if (acao2 === null) { pass++; console.log('  PASS  200 no Origin (curl) gets no ACAO header'); }
  else { fail++; console.log('  FAIL  unexpected ACAO for originless request:', acao2); }
}

console.log('\n-- game score invariants --');
{
  const env = makeEnv();
  await check('Slot Gate 4237 (not a multiple of 100)', 422, req('POST', '/scores/slotgate', { body: { name: 'x', score: 4237 } }), env);
  await check('Slot Gate 4200 accepted', 200, req('POST', '/scores/slotgate', { body: { name: 'x', score: 4200 } }), env);
  await check('Schrodinger 1200 (not a multiple of 500)', 422, req('POST', '/scores/schrodinger', { body: { name: 'x', score: 1200 } }), env);
  await check('Schrodinger 1500 accepted', 200, req('POST', '/scores/schrodinger', { body: { name: 'x', score: 1500 } }), env);
  await check('Runner 4237 accepted (step 1)', 200, req('POST', '/scores/runner', { body: { name: 'x', score: 4237 } }), env);
  await check('Slot Gate above ceiling', 422, req('POST', '/scores/slotgate', { body: { name: 'x', score: 9000000 } }), env);
}

console.log('\n-- malformed input --');
{
  const env = makeEnv();
  await check('score 9e18 (not a safe integer)', 400, req('POST', '/scores/runner', { body: { name: 'x', score: 9e18 } }), env);
  await check('negative score', 400, req('POST', '/scores/runner', { body: { name: 'x', score: -5 } }), env);
  await check('score as string', 400, req('POST', '/scores/runner', { body: { name: 'x', score: 'NaN' } }), env);
  await check('missing score', 400, req('POST', '/scores/runner', { body: { name: 'x' } }), env);
  await check('wrong content-type', 415, req('POST', '/scores/runner', { body: { score: 10 }, contentType: 'text/plain' }), env);
  await check('malformed JSON', 400, req('POST', '/scores/runner', { body: '{oops' }), env);
  await check('oversized body', 413, req('POST', '/scores/runner', { body: JSON.stringify({ name: 'x', score: 10, pad: 'A'.repeat(600) }) }), env);
  await check('array body (the old wipe vector)', 400,
    req('POST', '/scores/runner', { body: [{ name: 'wipe', score: 1 }] }), env);
}

console.log('\n-- name handling --');
{
  const env = makeEnv();
  const p = await check('script tag name stored as inert text', 200,
    req('POST', '/scores/runner', { body: { name: '<img src=x onerror=alert(1)>', score: 100 } }), env,
    pl => pl.entries[0].name === '<img src=x o');
  console.log('        stored name:', JSON.stringify(p.entries[0].name), '(truncated to 12)');

  const p2 = await check('control chars stripped', 200,
    req('POST', '/scores/runner', { body: { name: 'a\u0000b\u200Bc\u2028d', score: 200 } }), env,
    pl => pl.entries[0].name === 'abcd');
  console.log('        stored name:', JSON.stringify(p2.entries[0].name));

  const p3 = await check('empty name defaults', 200,
    req('POST', '/scores/runner', { body: { name: '   ', score: 300 } }), env,
    pl => pl.entries.some(e => e.name === 'Anonymous'));
  console.log('        names now:', p3.entries.map(e => e.name).join(', '));
}

console.log('\n-- server owns the merge --');
{
  const env = makeEnv();
  for (const s of [500, 100, 900, 300]) {
    await worker.fetch(req('POST', '/scores/runner', { body: { name: 'p' + s, score: s }, ip: '10.0.0.' + s % 250 }), env);
  }
  const p = await check('entries sorted descending', 200, req('GET', '/scores/runner'), env,
    pl => pl.entries.map(e => e.score).join() === '900,500,300,100');
  console.log('        scores:', p.entries.map(e => e.score).join(', '));

  const clientDate = await worker.fetch(req('POST', '/scores/runner', { body: { name: 'z', score: 42, date: '1999-01-01' }, ip: '10.9.9.9' }), env);
  const cd = await clientDate.json();
  const stamped = cd.entries.find(e => e.name === 'z').date;
  const isToday = stamped === new Date().toISOString().slice(0, 10);
  if (isToday) { pass++; console.log('  PASS  200 client-supplied date ignored, server stamped', stamped); }
  else { fail++; console.log('  FAIL  date was', stamped); }
}

console.log('\n-- board cannot be erased or overrun --');
{
  const env = makeEnv();
  for (let i = 0; i < 30; i++) {
    await worker.fetch(req('POST', '/scores/runner', { body: { name: 'n' + i, score: i * 10 }, ip: '10.1.' + i + '.1' }), env);
  }
  const p = await check('kept to top 20', 200, req('GET', '/scores/runner'), env, pl => pl.entries.length === 20);
  console.log('        entries:', p.entries.length, '| top:', p.entries[0].score, '| bottom:', p.entries[19].score);

  const before = env._store.get('lb:runner');
  await worker.fetch(req('POST', '/scores/runner', { body: [] }), env);
  await worker.fetch(req('POST', '/scores/runner', { body: { name: 'wipe', score: 'reset' } }), env);
  const after = env._store.get('lb:runner');
  if (before === after) { pass++; console.log('  PASS  ---  wipe attempts left the stored board untouched'); }
  else { fail++; console.log('  FAIL  stored board changed'); }
}

console.log('\n-- rate limiting --');
{
  const env = makeEnv();
  let statuses = [];
  for (let i = 0; i < 7; i++) {
    const r = await worker.fetch(req('POST', '/scores/runner', { body: { name: 'f' + i, score: 10 }, ip: '7.7.7.7' }), env);
    statuses.push(r.status);
  }
  const ok = statuses.slice(0, 5).every(s => s === 200) && statuses.slice(5).every(s => s === 429);
  if (ok) { pass++; console.log('  PASS  429 sixth submission throttled:', statuses.join(', ')); }
  else { fail++; console.log('  FAIL  statuses:', statuses.join(', ')); }

  const other = await worker.fetch(req('POST', '/scores/runner', { body: { name: 'other', score: 10 }, ip: '8.8.8.8' }), env);
  if (other.status === 200) { pass++; console.log('  PASS  200 a different IP is unaffected'); }
  else { fail++; console.log('  FAIL  other IP got', other.status); }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
