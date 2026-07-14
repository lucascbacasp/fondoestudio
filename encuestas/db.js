// Capa de datos — node:sqlite, sin dependencias externas.
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';

export function openDb(path = process.env.DB_PATH || 'encuestas.db') {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;

    -- Memoria de contactos: cada contacto cargado a mano queda guardado
    -- para la próxima (fricción principal de la Etapa 3).
    CREATE TABLE IF NOT EXISTS clients (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS clients_name ON clients(name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS jobs (
      id         INTEGER PRIMARY KEY,
      ref        TEXT NOT NULL,
      type       TEXT,
      client_id  INTEGER NOT NULL REFERENCES clients(id),
      closed_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS jobs_ref ON jobs(ref);

    -- status: pending_contact -> sent -> responded
    CREATE TABLE IF NOT EXISTS surveys (
      id           INTEGER PRIMARY KEY,
      job_id       INTEGER NOT NULL UNIQUE REFERENCES jobs(id),
      client_id    INTEGER NOT NULL REFERENCES clients(id),
      token        TEXT NOT NULL UNIQUE,
      status       TEXT NOT NULL DEFAULT 'pending_contact'
                   CHECK (status IN ('pending_contact','sent','responded')),
      rating       TEXT CHECK (rating IN ('insatisfecho','bueno','excelente')),
      resend_count INTEGER NOT NULL DEFAULT 0,
      sent_at      TEXT,
      responded_at TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Todo lo que "sale" del sistema (encuestas, recordatorios, alertas)
    -- queda registrado acá. El transporte real (email/WhatsApp) se enchufa
    -- por webhook; ver notify.js.
    CREATE TABLE IF NOT EXISTS outbox (
      id         INTEGER PRIMARY KEY,
      survey_id  INTEGER REFERENCES surveys(id),
      kind       TEXT NOT NULL CHECK (kind IN ('initial','reminder','alert')),
      recipient  TEXT NOT NULL,
      subject    TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function newToken() {
  return randomBytes(16).toString('hex');
}

// Busca el cliente por nombre; si ya lo conocemos con email y esta vez no
// vino, reusamos el guardado (auto-completar todo lo auto-completable).
export function upsertClient(db, { name, email }) {
  const existing = db
    .prepare('SELECT * FROM clients WHERE name = ? COLLATE NOCASE')
    .get(name.trim());
  if (existing) {
    if (email && email !== existing.email) {
      db.prepare('UPDATE clients SET email = ? WHERE id = ?').run(email, existing.id);
      return { ...existing, email };
    }
    return existing;
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO clients (name, email) VALUES (?, ?)')
    .run(name.trim(), email || null);
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(lastInsertRowid);
}

export function metrics(db) {
  const row = db.prepare(`
    SELECT
      COUNT(*)                                                  AS total,
      SUM(status IN ('sent','responded'))                       AS enviadas,
      SUM(status = 'pending_contact')                           AS sin_contacto,
      SUM(status = 'responded')                                 AS respondidas,
      SUM(rating = 'insatisfecho')                              AS insatisfecho,
      SUM(rating = 'bueno')                                     AS bueno,
      SUM(rating = 'excelente')                                 AS excelente
    FROM surveys
  `).get();
  const pct = (num, den) => (den ? Math.round((num / den) * 100) : 0);
  return {
    total: row.total,
    enviadas: row.enviadas ?? 0,
    sin_contacto: row.sin_contacto ?? 0,
    respondidas: row.respondidas ?? 0,
    desglose: {
      insatisfecho: row.insatisfecho ?? 0,
      bueno: row.bueno ?? 0,
      excelente: row.excelente ?? 0,
    },
    pct_enviadas: pct(row.enviadas ?? 0, row.total),
    pct_respondidas: pct(row.respondidas ?? 0, row.enviadas ?? 0),
    // Satisfacción = bueno + excelente sobre respondidas.
    pct_satisfaccion: pct((row.bueno ?? 0) + (row.excelente ?? 0), row.respondidas ?? 0),
  };
}
