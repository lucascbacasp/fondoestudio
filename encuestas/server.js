// Máquina de Encuestas — MVP lean (etapas 1, 3, 4, 5 del user journey,
// más reenvío manual con límite de 1). Sin dependencias externas.
//
//   node server.js          # http://localhost:3000
//
// Env: PORT, BASE_URL, DB_PATH, SEND_WEBHOOK_URL, ALERT_WEBHOOK_URL, OWNER_CONTACT

import { createServer } from 'node:http';
import { openDb, newToken, upsertClient, metrics } from './db.js';
import { deliver, surveyMessage, alertMessage } from './notify.js';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const db = openDb();

// ---------------------------------------------------------------- helpers

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100_000) reject(new Error('body demasiado grande'));
    });
    req.on('end', () => {
      const type = req.headers['content-type'] || '';
      try {
        if (type.includes('application/json')) resolve(JSON.parse(data || '{}'));
        else resolve(Object.fromEntries(new URLSearchParams(data)));
      } catch {
        reject(new Error('body inválido'));
      }
    });
    req.on('error', reject);
  });
}

function page(title, content) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.05rem; margin-top: 2rem; }
  table { border-collapse: collapse; width: 100%; font-size: .92rem; }
  th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #8884; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .8rem; margin: 1rem 0; }
  .tile { border: 1px solid #8884; border-radius: 10px; padding: .8rem 1rem; }
  .tile b { display: block; font-size: 1.8rem; }
  .tile small { opacity: .7; }
  .alert { border-left: 4px solid #d33; padding: .6rem .9rem; margin: .5rem 0; background: #d331; border-radius: 0 8px 8px 0; }
  form.inline { display: inline; }
  input, button { font: inherit; padding: .35rem .6rem; border-radius: 8px; border: 1px solid #8886; }
  button { cursor: pointer; }
  .rating-btns { display: grid; gap: 1rem; margin-top: 2rem; }
  .rating-btns button { font-size: 1.3rem; padding: 1.1rem; border-radius: 14px; border-width: 2px; }
  .muted { opacity: .65; font-size: .88rem; }
  .ok { color: #2a7; }
</style>
</head><body>${content}</body></html>`;
}

function send(res, status, html) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function redirect(res, to) {
  res.writeHead(303, { location: to });
  res.end();
}

// ------------------------------------------------------------- flujo core

// Etapa 1+3: el cierre del trabajo dispara la encuesta sin pasos extra.
// Con email conocido sale sola; sin email queda visible como "sin contacto".
async function closeJob({ ref, type, clientName, clientEmail }) {
  const client = upsertClient(db, { name: clientName, email: clientEmail });

  const dupe = db.prepare('SELECT id FROM jobs WHERE ref = ?').get(ref);
  if (dupe) return { duplicated: true };

  const job = (() => {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO jobs (ref, type, client_id) VALUES (?, ?, ?)')
      .run(ref, type || null, client.id);
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(lastInsertRowid);
  })();

  const token = newToken();
  db.prepare('INSERT INTO surveys (job_id, client_id, token) VALUES (?, ?, ?)')
    .run(job.id, client.id, token);
  const survey = db.prepare('SELECT * FROM surveys WHERE token = ?').get(token);

  if (client.email) await sendSurvey(survey, client, job, 'initial');
  return { survey, sent: Boolean(client.email) };
}

async function sendSurvey(survey, client, job, kind) {
  const msg = surveyMessage(BASE_URL, survey, client, job, kind);
  await deliver(db, { surveyId: survey.id, kind, recipient: client.email, ...msg });
  if (kind === 'initial') {
    db.prepare(
      "UPDATE surveys SET status = 'sent', sent_at = datetime('now') WHERE id = ? AND status = 'pending_contact'"
    ).run(survey.id);
  } else {
    db.prepare('UPDATE surveys SET resend_count = resend_count + 1 WHERE id = ?').run(survey.id);
  }
}

// Etapa 4: registrar respuesta. Idempotente: la primera respuesta gana.
async function recordResponse(token, rating) {
  const survey = db.prepare('SELECT * FROM surveys WHERE token = ?').get(token);
  if (!survey) return { error: 'not_found' };
  if (survey.status === 'responded') return { survey, already: true };

  db.prepare(
    "UPDATE surveys SET status = 'responded', rating = ?, responded_at = datetime('now') WHERE id = ?"
  ).run(rating, survey.id);
  const updated = db.prepare('SELECT * FROM surveys WHERE id = ?').get(survey.id);

  // Etapa 5, riesgo #2: el insatisfecho no es un número, es una alerta
  // inmediata con el dato del cliente para recuperarlo en el día.
  if (rating === 'insatisfecho') {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(survey.client_id);
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(survey.job_id);
    await deliver(db, {
      surveyId: survey.id,
      kind: 'alert',
      recipient: process.env.OWNER_CONTACT || 'dueño',
      ...alertMessage(updated, client, job),
    });
  }
  return { survey: updated };
}

// ------------------------------------------------------------------ vistas

const RATINGS = [
  ['insatisfecho', '😞 Insatisfecho'],
  ['bueno', '🙂 Bueno'],
  ['excelente', '🤩 Excelente'],
];

function surveyPage(survey, job) {
  return page('¿Cómo salió el trabajo?', `
    <h1>¿Cómo salió el trabajo${job.type ? ` de ${esc(job.type)}` : ''}?</h1>
    <p class="muted">Un solo toque y listo. Sin registrarse.</p>
    <div class="rating-btns">
      ${RATINGS.map(([value, label]) => `
        <form method="post" action="/s/${esc(survey.token)}">
          <input type="hidden" name="rating" value="${value}">
          <button style="width:100%">${label}</button>
        </form>`).join('')}
    </div>`);
}

function thanksPage(already) {
  return page('¡Gracias!', `
    <h1>¡Gracias por tu respuesta! 🙌</h1>
    <p class="muted">${already ? 'Ya habíamos registrado tu respuesta anterior.' : 'Tu opinión nos ayuda a mejorar.'}</p>`);
}

function dashboardPage() {
  const m = metrics(db);
  const rows = db.prepare(`
    SELECT s.*, c.name AS client_name, c.email AS client_email, j.ref AS job_ref, j.type AS job_type
    FROM surveys s JOIN clients c ON c.id = s.client_id JOIN jobs j ON j.id = s.job_id
    ORDER BY s.created_at DESC LIMIT 100
  `).all();

  const insatisfechos = rows.filter((r) => r.rating === 'insatisfecho');
  const sinContacto = rows.filter((r) => r.status === 'pending_contact');
  const sinRespuesta = rows.filter((r) => r.status === 'sent');

  return page('Encuestas — Dashboard', `
    <h1>Máquina de Encuestas</h1>

    <div class="tiles">
      <div class="tile"><b>${m.pct_enviadas}%</b><small>enviadas (${m.enviadas}/${m.total})</small></div>
      <div class="tile"><b>${m.pct_respondidas}%</b><small>respondidas (${m.respondidas}/${m.enviadas})</small></div>
      <div class="tile"><b>${m.pct_satisfaccion}%</b><small>satisfacción</small></div>
      <div class="tile"><b>${m.desglose.insatisfecho} / ${m.desglose.bueno} / ${m.desglose.excelente}</b>
        <small>insatisfecho / bueno / excelente</small></div>
    </div>

    ${insatisfechos.length ? `<h2>⚠ Insatisfechos — llamar hoy</h2>` +
      insatisfechos.map((r) => `
        <div class="alert"><b>${esc(r.client_name)}</b> — trabajo ${esc(r.job_ref)}
          ${r.job_type ? `(${esc(r.job_type)})` : ''}<br>
          <span class="muted">${esc(r.client_email || 'sin email')} · respondió ${esc(r.responded_at)}</span>
        </div>`).join('') : ''}

    ${sinContacto.length ? `<h2>Sin contacto — cargar email para enviar</h2>
      <table><tr><th>Cliente</th><th>Trabajo</th><th></th></tr>` +
      sinContacto.map((r) => `
        <tr><td>${esc(r.client_name)}</td><td>${esc(r.job_ref)}</td>
        <td><form class="inline" method="post" action="/surveys/${r.id}/contact">
          <input name="email" type="email" placeholder="email@cliente.com" required>
          <button>Guardar y enviar</button></form></td></tr>`).join('') + '</table>' : ''}

    ${sinRespuesta.length ? `<h2>Enviadas sin respuesta</h2>
      <table><tr><th>Cliente</th><th>Trabajo</th><th>Enviada</th><th></th></tr>` +
      sinRespuesta.map((r) => `
        <tr><td>${esc(r.client_name)}</td><td>${esc(r.job_ref)}</td>
        <td class="muted">${esc(r.sent_at)}</td>
        <td>${r.resend_count >= 1
          ? '<span class="muted">reenviada (límite: 1)</span>'
          : `<form class="inline" method="post" action="/surveys/${r.id}/resend"><button>Reenviar</button></form>`}
        </td></tr>`).join('') + '</table>' : ''}

    <h2>Simular cierre de trabajo</h2>
    <p class="muted">En producción esto lo dispara el sistema del operario vía
      <code>POST /api/jobs/close</code>. Si el cliente ya existe con email, no hace falta cargarlo.</p>
    <form method="post" action="/api/jobs/close">
      <input name="ref" placeholder="Nro de trabajo" required>
      <input name="type" placeholder="Tipo (ej: plomería)">
      <input name="client_name" placeholder="Cliente" required>
      <input name="client_email" type="email" placeholder="Email (opcional)">
      <button>Cerrar trabajo</button>
    </form>`);
}

// ------------------------------------------------------------------ rutas

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE_URL);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/') return send(res, 200, dashboardPage());
    if (req.method === 'GET' && path === '/api/metrics') return sendJson(res, 200, metrics(db));

    // Etapa 1: hook de cierre. Acepta JSON (integración) o form (demo).
    if (req.method === 'POST' && path === '/api/jobs/close') {
      const b = await readBody(req);
      const ref = (b.ref || '').trim();
      const clientName = (b.client_name || b.clientName || '').trim();
      if (!ref || !clientName)
        return sendJson(res, 400, { error: 'ref y client_name son obligatorios' });
      const result = await closeJob({
        ref,
        type: (b.type || '').trim(),
        clientName,
        clientEmail: (b.client_email || b.clientEmail || '').trim() || null,
      });
      if (req.headers['content-type']?.includes('application/json')) {
        if (result.duplicated) return sendJson(res, 409, { error: 'trabajo ya cerrado' });
        return sendJson(res, 201, { survey_url: `${BASE_URL}/s/${result.survey.token}`, sent: result.sent });
      }
      return redirect(res, '/');
    }

    // Etapa 3: rescate de contacto faltante (queda guardado para la próxima).
    const contactMatch = path.match(/^\/surveys\/(\d+)\/contact$/);
    if (req.method === 'POST' && contactMatch) {
      const b = await readBody(req);
      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(Number(contactMatch[1]));
      const email = (b.email || '').trim();
      if (!survey || survey.status !== 'pending_contact' || !email)
        return send(res, 400, page('Error', '<p>Encuesta o email inválidos.</p>'));
      db.prepare('UPDATE clients SET email = ? WHERE id = ?').run(email, survey.client_id);
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(survey.client_id);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(survey.job_id);
      await sendSurvey(survey, client, job, 'initial');
      return redirect(res, '/');
    }

    // Etapa 6 (versión MVP): reenvío manual, máximo 1 por encuesta.
    const resendMatch = path.match(/^\/surveys\/(\d+)\/resend$/);
    if (req.method === 'POST' && resendMatch) {
      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(Number(resendMatch[1]));
      if (!survey || survey.status !== 'sent')
        return send(res, 400, page('Error', '<p>Encuesta inválida.</p>'));
      if (survey.resend_count >= 1)
        return send(res, 409, page('Límite', '<p>Ya se reenvió una vez. La regla es 1 reenvío y cortar.</p>'));
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(survey.client_id);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(survey.job_id);
      await sendSurvey(survey, client, job, 'reminder');
      return redirect(res, '/');
    }

    // Etapa 4: la encuesta. Una pregunta, tres botones, sin login.
    const surveyMatch = path.match(/^\/s\/([a-f0-9]{32})$/);
    if (surveyMatch) {
      if (req.method === 'GET') {
        const survey = db.prepare('SELECT * FROM surveys WHERE token = ?').get(surveyMatch[1]);
        if (!survey) return send(res, 404, page('No encontrada', '<p>Encuesta no encontrada.</p>'));
        if (survey.status === 'responded') return send(res, 200, thanksPage(true));
        const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(survey.job_id);
        return send(res, 200, surveyPage(survey, job));
      }
      if (req.method === 'POST') {
        const b = await readBody(req);
        if (!['insatisfecho', 'bueno', 'excelente'].includes(b.rating))
          return send(res, 400, page('Error', '<p>Respuesta inválida.</p>'));
        const result = await recordResponse(surveyMatch[1], b.rating);
        if (result.error) return send(res, 404, page('No encontrada', '<p>Encuesta no encontrada.</p>'));
        return send(res, 200, thanksPage(result.already));
      }
    }

    send(res, 404, page('404', '<p>No encontrado.</p>'));
  } catch (err) {
    console.error(err);
    send(res, 500, page('Error', '<p>Error interno.</p>'));
  }
});

server.listen(PORT, () => {
  console.log(`Máquina de Encuestas corriendo en ${BASE_URL}`);
});
