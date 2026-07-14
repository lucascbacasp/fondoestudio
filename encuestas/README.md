# Máquina de Encuestas — MVP

Encuestas de satisfacción post-trabajo para un SMB de servicios: el cierre del
trabajo dispara automáticamente una encuesta de **una sola pregunta** al
cliente, y el dueño ve el estado del negocio en un dashboard de 4 números —
con **alerta inmediata** cuando alguien responde insatisfecho.

Construido desde cero a partir de [`docs/user-journey.md`](docs/user-journey.md),
implementando exactamente el MVP lean que ese documento recomienda.

## Cómo correr

Sin dependencias: solo Node.js ≥ 22 (usa `node:sqlite` y `node:http`).

```bash
node server.js        # dashboard en http://localhost:3000
node --test test.js   # smoke test end-to-end del flujo completo
```

Variables de entorno (todas opcionales):

| Variable | Para qué |
|---|---|
| `PORT` / `BASE_URL` | Puerto y URL pública (la que va en los links de encuesta) |
| `DB_PATH` | Archivo SQLite (default `encuestas.db`) |
| `SEND_WEBHOOK_URL` | Webhook al que se POSTea cada envío (enchufe para email/WhatsApp) |
| `ALERT_WEBHOOK_URL` | Webhook para alertas de insatisfecho (default: el anterior) |
| `OWNER_CONTACT` | Email/teléfono del dueño que figura como destinatario de alertas |

## Qué se construyó y por qué (análisis del journey)

El documento define 6 etapas, 3 riesgos ordenados y un recorte de MVP. Este
código sigue ese recorte al pie de la letra:

### Etapa 1 — Cierre del trabajo ✅
`POST /api/jobs/close` es el hook: un solo llamado desde el sistema del
operario crea el trabajo **y** la encuesta, sin pasos extra. Es idempotente
por número de trabajo (`ref`): un cierre duplicado devuelve 409 y no genera
segunda encuesta. La métrica de la etapa (% de cierres que generan encuesta)
es 100% por construcción — no existe cierre sin encuesta.

### Etapa 2 — Selección de encuesta ✂️ (recortada, como pide el doc)
Una sola encuesta hardcodeada. El campo `type` del trabajo ya se guarda, así
que el mapeo tipo→encuesta se agrega después sin migración.

### Etapa 3 — Envío ✅ (el riesgo #1 del doc)
- Si el cliente tiene email conocido, la encuesta **sale sola** en el mismo
  request del cierre.
- Si no, queda visible en el dashboard como "Sin contacto" con un form de
  una línea: cargás el email, se envía, **y el contacto queda guardado** en
  la tabla `clients` — el próximo trabajo de ese cliente sale automático.
  Esto ataca directamente la fricción que el doc marca como donde "muere la
  adopción".
- El transporte real no está acoplado: cada mensaje queda en la tabla
  `outbox` (auditable) y se POSTea a `SEND_WEBHOOK_URL` si está configurada.
  Ahí se enchufa Resend/Twilio/Zapier sin tocar el código.

### Etapa 4 — Respuesta ✅
`GET /s/:token`: una pregunta, tres botones grandes (Insatisfecho / Bueno /
Excelente), sin login, mobile-first. Responder es un tap. Es idempotente: la
primera respuesta gana y las siguientes ven "ya registramos tu respuesta".

### Etapa 5 — Dashboard + alerta ✅ (el riesgo #2 del doc)
Los 4 números del doc: % enviadas, % respondidas, % satisfacción y el
desglose insatisfecho/bueno/excelente (también por API en `/api/metrics`).
Y lo que el doc marca como el valor real del producto: cada respuesta
"insatisfecho" dispara una **alerta inmediata** (outbox + `ALERT_WEBHOOK_URL`)
con nombre, contacto y trabajo del cliente, y aparece arriba de todo en el
dashboard como "⚠ Insatisfechos — llamar hoy".

### Etapa 6 — Seguimiento ✅ (versión MVP: botón manual)
Botón "Reenviar" en cada encuesta sin respuesta, con la regla anti-spam
**definida antes de construir** (riesgo #3): máximo 1 reenvío por encuesta,
aplicado en el servidor (409 al segundo intento), no solo escondiendo el botón.

## Modelo de datos

```
clients  ─┬─ jobs ─── surveys ─── outbox
          └───────────┘
```

- `clients` — la memoria de contactos (nombre único, email se completa una vez)
- `jobs` — trabajo cerrado (`ref` único = idempotencia del hook)
- `surveys` — estado: `pending_contact → sent → responded`, rating, contador de reenvíos
- `outbox` — todo mensaje saliente (initial / reminder / alert), auditable

## API

| Método y ruta | Qué hace |
|---|---|
| `POST /api/jobs/close` | Hook de cierre. JSON: `{ref, type?, client_name, client_email?}` → `{survey_url, sent}` |
| `GET /s/:token` | Página de encuesta (pública, sin login) |
| `POST /s/:token` | Registra la respuesta (`rating=insatisfecho\|bueno\|excelente`) |
| `POST /surveys/:id/contact` | Carga el email faltante, lo guarda en el cliente y envía |
| `POST /surveys/:id/resend` | Reenvío manual (máx. 1; después 409) |
| `GET /api/metrics` | Los 4 números en JSON |
| `GET /` | Dashboard |

## Qué quedó afuera (a propósito) y cómo se agrega

En el orden en que el doc dice "se agrega cuando alguien lo pida":

1. **Reenvío automático a las 48-72 hs**: un cron que busque
   `status='sent' AND resend_count=0 AND sent_at < datetime('now','-48 hours')`
   y llame a la misma función `sendSurvey(..., 'reminder')` que hoy usa el botón.
2. **Múltiples encuestas por tipo de servicio** (Etapa 2): tabla `survey_templates`
   + mapeo desde `jobs.type`; la selección manual como excepción.
3. **WhatsApp**: es solo otro consumidor del webhook de salida — el core no cambia.
4. **Envío de email directo**: hoy el sistema registra en `outbox` y delega el
   transporte al webhook; integrar un proveedor (Resend, SES) es implementar
   ese consumidor.
