// Smoke test end-to-end: recorre el journey completo contra el server real.
//   node --test test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const PORT = 3777;
const BASE = `http://localhost:${PORT}`;
const DB = 'test-encuestas.db';
let server;

before(async () => {
  for (const f of [DB, `${DB}-wal`, `${DB}-shm`]) rmSync(f, { force: true });
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT, DB_PATH: DB, SEND_WEBHOOK_URL: '', ALERT_WEBHOOK_URL: '' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('el server no levantó');
});

after(() => {
  server.kill();
  for (const f of [DB, `${DB}-wal`, `${DB}-shm`]) rmSync(f, { force: true });
});

const closeJob = (body) =>
  fetch(`${BASE}/api/jobs/close`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('etapas 1+3: cierre con email envía automático', async () => {
  const res = await closeJob({ ref: 'J-1', type: 'plomería', client_name: 'Ana', client_email: 'ana@x.com' });
  assert.equal(res.status, 201);
  const { survey_url, sent } = await res.json();
  assert.equal(sent, true);
  assert.match(survey_url, /\/s\/[a-f0-9]{32}$/);
});

test('etapa 1: cierre duplicado no genera segunda encuesta', async () => {
  const res = await closeJob({ ref: 'J-1', client_name: 'Ana' });
  assert.equal(res.status, 409);
});

test('etapas 4+5: responder insatisfecho registra y dispara alerta', async () => {
  const res = await closeJob({ ref: 'J-2', client_name: 'Beto', client_email: 'beto@x.com' });
  const { survey_url } = await res.json();

  const pageRes = await fetch(survey_url);
  assert.equal(pageRes.status, 200);
  assert.match(await pageRes.text(), /Insatisfecho/);

  const answer = await fetch(survey_url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'rating=insatisfecho',
  });
  assert.equal(answer.status, 200);
  assert.match(await answer.text(), /Gracias/);

  // Idempotencia: una segunda respuesta no pisa la primera.
  const again = await fetch(survey_url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'rating=excelente',
  });
  assert.match(await again.text(), /Ya habíamos registrado/);

  const m = await (await fetch(`${BASE}/api/metrics`)).json();
  assert.equal(m.desglose.insatisfecho, 1);
  assert.equal(m.desglose.excelente, 0);

  // La alerta quedó visible en el dashboard con el dato del cliente.
  const dash = await (await fetch(BASE)).text();
  assert.match(dash, /Insatisfechos — llamar hoy/);
  assert.match(dash, /Beto/);
});

test('etapa 3: sin email queda pendiente; cargar contacto envía y lo guarda', async () => {
  await closeJob({ ref: 'J-3', client_name: 'Carla' });
  let dash = await (await fetch(BASE)).text();
  assert.match(dash, /Sin contacto/);

  const id = dash.match(/\/surveys\/(\d+)\/contact/)[1];
  const res = await fetch(`${BASE}/surveys/${id}/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=carla%40x.com',
    redirect: 'manual',
  });
  assert.equal(res.status, 303);

  // Contacto guardado: el próximo trabajo de Carla sale automático sin email.
  const next = await closeJob({ ref: 'J-4', client_name: 'Carla' });
  assert.equal((await next.json()).sent, true);
});

test('etapa 6: reenvío manual permitido una sola vez', async () => {
  await closeJob({ ref: 'J-5', client_name: 'Dario', client_email: 'dario@x.com' });
  const dash = await (await fetch(BASE)).text();
  const id = dash.match(/\/surveys\/(\d+)\/resend/)[1];

  const first = await fetch(`${BASE}/surveys/${id}/resend`, { method: 'POST', redirect: 'manual' });
  assert.equal(first.status, 303);
  const second = await fetch(`${BASE}/surveys/${id}/resend`, { method: 'POST', redirect: 'manual' });
  assert.equal(second.status, 409);
});

test('métricas: los 4 números cierran', async () => {
  const m = await (await fetch(`${BASE}/api/metrics`)).json();
  assert.equal(m.total, 5);          // J-1..J-5
  assert.equal(m.enviadas, 5);       // todas terminaron enviadas
  assert.equal(m.pct_enviadas, 100);
  assert.equal(m.respondidas, 1);    // solo Beto respondió
  assert.equal(m.pct_satisfaccion, 0); // y respondió insatisfecho
});
