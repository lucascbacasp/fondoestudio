// Salida de mensajes (encuestas, recordatorios, alertas).
//
// El MVP no habla con un proveedor de email/WhatsApp directamente: todo
// mensaje queda en la tabla `outbox` (auditable) y, si SEND_WEBHOOK_URL
// está configurada, se hace POST del mensaje ahí — ese webhook es el punto
// de enchufe para Resend/Twilio/Zapier/n8n sin tocar este código.
//
//   SEND_WEBHOOK_URL   destino de encuestas y recordatorios
//   ALERT_WEBHOOK_URL  destino de alertas de insatisfecho (default: el de arriba)
//   OWNER_CONTACT      a quién le llegan las alertas (email/teléfono del dueño)

export async function deliver(db, { surveyId, kind, recipient, subject, body }) {
  db.prepare(
    'INSERT INTO outbox (survey_id, kind, recipient, subject, body) VALUES (?, ?, ?, ?, ?)'
  ).run(surveyId ?? null, kind, recipient, subject, body);

  const url =
    kind === 'alert'
      ? process.env.ALERT_WEBHOOK_URL || process.env.SEND_WEBHOOK_URL
      : process.env.SEND_WEBHOOK_URL;

  if (url) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, recipient, subject, body }),
      });
    } catch (err) {
      // El envío externo puede fallar; el mensaje ya quedó en outbox para
      // reintentar. No frenamos el flujo del operario por esto.
      console.error(`[notify] fallo el webhook (${kind} -> ${recipient}):`, err.message);
    }
  }
  console.log(`[notify] ${kind} -> ${recipient}: ${subject}`);
}

export function surveyMessage(baseUrl, survey, client, job, kind) {
  const link = `${baseUrl}/s/${survey.token}`;
  const subject =
    kind === 'reminder'
      ? `¿Nos das tu opinión? Es una sola pregunta`
      : `¿Cómo salió el trabajo? Respondé con un toque`;
  const body =
    `Hola ${client.name},\n\n` +
    `Terminamos el trabajo${job.type ? ` de ${job.type}` : ''} (${job.ref}). ` +
    `¿Cómo salió? Es una sola pregunta, sin registrarse:\n\n${link}\n\nGracias!`;
  return { subject, body };
}

export function alertMessage(survey, client, job) {
  return {
    subject: `⚠ Cliente insatisfecho: ${client.name}`,
    body:
      `${client.name} respondió INSATISFECHO por el trabajo ${job.ref}` +
      `${job.type ? ` (${job.type})` : ''}.\n` +
      `Contacto: ${client.email || 'sin email'}\n` +
      `Respondió: ${survey.responded_at}\n\n` +
      `Llamalo hoy para recuperarlo.`,
  };
}
