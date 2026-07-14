// Tablero — vanilla JS, sin build. Lee /api/state y ejecuta acciones.

const app = document.getElementById('app');
const configLine = document.getElementById('config-line');
let lastPayload = '';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// SQLite guarda UTC "YYYY-MM-DD HH:MM:SS" → hora local legible.
const fmt = (s) => {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const contact = (r) => esc(r.client_email || (r.client_phone ? `+${r.client_phone}` : 'sin datos'));
const channelBadge = (ch) =>
  ch ? `<span class="badge">${ch === 'email' ? '✉ email' : '💬 whatsapp'}</span>` : '';

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) alert(data.error || 'Error');
  return data;
}

// ------------------------------------------------------------- secciones

function tiles(m) {
  const d = m.desglose;
  const total = d.insatisfecho + d.bueno + d.excelente;
  const pct = (n) => (total ? Math.max((n / total) * 100, n ? 3 : 0) : 0);
  return `
  <div class="tiles">
    <div class="tile"><b>${m.pct_enviadas}%</b><small>enviadas · ${m.enviadas} de ${m.total}</small></div>
    <div class="tile"><b>${m.pct_respondidas}%</b><small>respondidas · ${m.respondidas} de ${m.enviadas}</small></div>
    <div class="tile"><b>${m.pct_satisfaccion}%</b><small>satisfacción (bueno + excelente)</small></div>
    <div class="tile ${m.casos_abiertos ? 'crit' : ''}"><b>${m.casos_abiertos}</b><small>casos abiertos</small></div>
  </div>
  ${total ? `
  <div class="dist">
    <div class="dist-bar" role="img" aria-label="Desglose: ${d.insatisfecho} insatisfecho, ${d.bueno} bueno, ${d.excelente} excelente">
      ${d.insatisfecho ? `<span style="flex:${pct(d.insatisfecho)};background:var(--status-crit)"></span>` : ''}
      ${d.bueno ? `<span style="flex:${pct(d.bueno)};background:var(--status-warn)"></span>` : ''}
      ${d.excelente ? `<span style="flex:${pct(d.excelente)};background:var(--status-good)"></span>` : ''}
    </div>
    <div class="dist-legend">
      <span><i class="chip crit"></i>😞 Insatisfecho · ${d.insatisfecho}</span>
      <span><i class="chip warn"></i>🙂 Bueno · ${d.bueno}</span>
      <span><i class="chip good"></i>🤩 Excelente · ${d.excelente}</span>
    </div>
  </div>` : ''}`;
}

function casesSection(cases) {
  if (!cases.length) return '';
  const open = cases.filter((k) => k.status !== 'resuelto');
  const resolved = cases.filter((k) => k.status === 'resuelto').slice(0, 5);
  const card = (k) => `
    <div class="card ${k.status === 'resuelto' ? 'case-resolved' : 'case-open'}">
      <span class="who">${esc(k.client_name)}</span>
      <span class="badge">${esc(k.status.replace('_', ' '))}</span>
      <span class="muted">trabajo ${esc(k.job_ref)}${k.job_type ? ` · ${esc(k.job_type)}` : ''}
        · respondió ${fmt(k.responded_at)} · ${contact(k)}</span>
      ${k.status === 'resuelto' ? `<div class="muted">resuelto ${fmt(k.resolved_at)}</div>` : `
      <div class="row">
        <textarea data-case-notes="${k.id}" placeholder="Notas del caso…">${esc(k.notes)}</textarea>
      </div>
      <div class="row">
        ${k.status === 'abierto' ? `<button data-case="${k.id}" data-status="en_tratamiento">Pasar a en tratamiento</button>` : ''}
        <button class="primary" data-case="${k.id}" data-status="resuelto">Marcar resuelto</button>
        <button class="ghost" data-case="${k.id}" data-status="${k.status}">Guardar notas</button>
      </div>`}
    </div>`;
  return `<h2>⚠ Casos de insatisfechos${open.length ? ` (${open.length} abiertos — llamar hoy)` : ''}</h2>
    ${open.map(card).join('') || '<p class="empty">Sin casos abiertos.</p>'}
    ${resolved.length ? resolved.map(card).join('') : ''}`;
}

function readySection(ready) {
  if (!ready.length) return '';
  return `<h2>💬 Para enviar por WhatsApp (un tap)</h2>
    <p class="muted">El botón abre WhatsApp con el mensaje y el link ya armados; solo tocás enviar.</p>
    ${ready.map((r) => `
    <div class="card">
      <span class="who">${esc(r.client_name)}</span> ${channelBadge(r.channel)}
      <span class="muted">trabajo ${esc(r.job_ref)} · +${esc(r.client_phone)}</span>
      <div class="row"><a class="wa" href="/wa/${r.id}" target="_blank" data-refresh>Enviar por WhatsApp →</a></div>
    </div>`).join('')}`;
}

function pendingSection(pending) {
  if (!pending.length) return '';
  return `<h2>Sin contacto — cargar para enviar</h2>
    <p class="muted">El dato queda guardado: el próximo trabajo de este cliente sale automático.</p>
    ${pending.map((r) => `
    <div class="card">
      <span class="who">${esc(r.client_name)}</span>
      <span class="muted">trabajo ${esc(r.job_ref)}</span>
      <form class="row" data-contact="${r.id}">
        <input name="email" type="email" placeholder="email@cliente.com">
        <input name="phone" type="tel" placeholder="WhatsApp ej: 5491122334455">
        <button class="primary">Guardar y enviar</button>
      </form>
    </div>`).join('')}`;
}

function unansweredSection(unanswered, cfg) {
  if (!unanswered.length) return '';
  return `<h2>Enviadas sin respuesta</h2>
    ${cfg.auto_reminder_hours > 0 ? `<p class="muted">Reenvío automático a las ${cfg.auto_reminder_hours} hs por los canales automáticos (máximo 1 y corta).</p>` : ''}
    <table><tr><th>Cliente</th><th>Trabajo</th><th>Canal</th><th>Enviada</th><th></th></tr>
    ${unanswered.map((r) => `
      <tr><td>${esc(r.client_name)}</td><td>${esc(r.job_ref)}</td>
      <td>${channelBadge(r.channel)}</td><td class="num">${fmt(r.sent_at)}</td>
      <td>${r.resend_count >= 1
        ? '<span class="muted">reenviada (límite: 1)</span>'
        : r.can_auto
          ? `<button data-resend="${r.id}">Reenviar</button>`
          : `<a class="wa" href="/wa/${r.id}" target="_blank" data-refresh>Reenviar por WhatsApp →</a>`
      }</td></tr>`).join('')}</table>`;
}

function scheduledSection(scheduled) {
  if (!scheduled.length) return '';
  return `<h2>Programadas (envío diferido)</h2>
    <table><tr><th>Cliente</th><th>Trabajo</th><th>Canal</th><th>Sale</th></tr>
    ${scheduled.map((r) => `
      <tr><td>${esc(r.client_name)}</td><td>${esc(r.job_ref)}</td>
      <td>${channelBadge(r.channel)}</td><td class="num">${fmt(r.scheduled_at)}</td></tr>`).join('')}</table>`;
}

function atRiskSection(atRisk) {
  if (!atRisk.length) return '';
  return `<h2>Clientes en riesgo (insatisfacción recurrente)</h2>
    <table><tr><th>Cliente</th><th>Contacto</th><th>Insatisfechos</th><th>Último</th></tr>
    ${atRisk.map((c) => `
      <tr><td>${esc(c.name)}</td><td>${esc(c.email || (c.phone ? `+${c.phone}` : '—'))}</td>
      <td class="num">${c.insatisfechos}</td><td class="num">${fmt(c.ultimo)}</td></tr>`).join('')}</table>`;
}

function activitySection(activity) {
  if (!activity.length) return '';
  const KIND = {
    initial: 'encuesta', reminder: 'recordatorio', alert: '⚠ alerta',
    followup: '⏰ seguimiento', resolution: 'resolución',
  };
  return `<details class="activity"><summary>Actividad reciente (${activity.length})</summary>
    ${activity.map((a) => `
      <div class="activity-item"><b>${KIND[a.kind] || a.kind}</b>
        <span class="muted">${esc(a.channel)} → ${esc(a.recipient)} · ${fmt(a.created_at)}</span><br>
        ${esc(a.subject)}</div>`).join('')}</details>`;
}

function closeJobSection() {
  return `<h2>Cerrar trabajo</h2>
    <p class="muted">En producción esto lo dispara tu sistema con <code>POST /api/jobs/close</code>.
    Si el cliente ya existe, no hace falta cargar el contacto de nuevo.</p>
    <form class="close-job card" id="close-job">
      <input name="ref" placeholder="Nro de trabajo" required>
      <input name="type" placeholder="Tipo (ej: plomería)">
      <input name="client_name" placeholder="Cliente" required>
      <input name="client_email" type="email" placeholder="Email (opcional)">
      <input name="client_phone" type="tel" placeholder="WhatsApp (opcional)">
      <button class="primary">Cerrar trabajo → disparar encuesta</button>
    </form>`;
}

// ------------------------------------------------------------- render

function render(state) {
  const cfg = state.config;
  configLine.textContent =
    `Envío diferido: ${cfg.delay_minutes} min · WhatsApp: ${cfg.wa_gateway ? 'gateway automático' : 'tap-to-send (wa.me)'}` +
    ` · Reseña Google: ${cfg.google_review ? 'activa' : 'sin configurar'}`;

  app.innerHTML = [
    tiles(state.metrics),
    casesSection(state.cases),
    readySection(state.ready),
    pendingSection(state.pending_contact),
    unansweredSection(state.unanswered, cfg),
    scheduledSection(state.scheduled),
    atRiskSection(state.at_risk),
    activitySection(state.activity),
    closeJobSection(),
  ].join('');
}

async function refresh(force = false) {
  // No pisar lo que el usuario está tipeando.
  if (!force && app.contains(document.activeElement) &&
      /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  try {
    const res = await fetch('/api/state');
    const text = await res.text();
    if (!force && text === lastPayload) return;
    lastPayload = text;
    render(JSON.parse(text));
  } catch {
    /* servidor reiniciando: el próximo poll lo levanta */
  }
}

// ------------------------------------------------------------- acciones

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  if (form.id === 'close-job') {
    const r = await post('/api/jobs/close', data);
    if (r.survey_url) form.reset();
  } else if (form.dataset.contact) {
    await post(`/api/surveys/${form.dataset.contact}/contact`, data);
  }
  refresh(true);
});

app.addEventListener('click', async (e) => {
  const btn = e.target.closest('button, a[data-refresh]');
  if (!btn) return;

  if (btn.dataset.resend) {
    await post(`/api/surveys/${btn.dataset.resend}/resend`);
    refresh(true);
  } else if (btn.dataset.case) {
    const notes = document.querySelector(`[data-case-notes="${btn.dataset.case}"]`)?.value;
    const r = await post(`/api/cases/${btn.dataset.case}`, { status: btn.dataset.status, notes });
    // Resolución con WhatsApp en modo tap: abrir el agradecimiento prearmado.
    if (r.wa_link) window.open(r.wa_link, '_blank');
    refresh(true);
  } else if (btn.dataset.refresh !== undefined) {
    setTimeout(() => refresh(true), 800); // el /wa/:id marca enviada al abrirse
  }
});

refresh(true);
setInterval(refresh, 8000);
