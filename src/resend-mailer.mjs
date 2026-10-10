const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const LOCAL_TEST_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function resolveResendEndpoint({ testMode = false, testEndpoint = '' } = {}) {
  if (testMode === true) {
    try {
      const endpoint = new URL(testEndpoint);
      if (endpoint.protocol === 'http:' && LOCAL_TEST_HOSTS.has(endpoint.hostname)) return endpoint.toString();
    } catch (_) {}
  }
  return RESEND_EMAILS_URL;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export async function sendPasswordResetEmail({
  apiKey,
  fromEmail,
  to,
  resetUrl,
  testMode = false,
  testEndpoint = '',
  fetchImpl = globalThis.fetch
}) {
  if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 512) throw new Error('resend_not_configured');
  if (typeof fromEmail !== 'string' || !emailPattern.test(fromEmail) || fromEmail.length > 254) throw new Error('resend_sender_invalid');
  if (typeof to !== 'string' || !emailPattern.test(to) || to.length > 254) throw new Error('resend_recipient_invalid');
  if (typeof fetchImpl !== 'function') throw new Error('resend_transport_unavailable');

  let parsedResetUrl;
  try { parsedResetUrl = new URL(resetUrl); }
  catch (_) { throw new Error('resend_reset_url_invalid'); }
  const localReset = testMode === true && parsedResetUrl.protocol === 'http:' && LOCAL_TEST_HOSTS.has(parsedResetUrl.hostname);
  if (parsedResetUrl.protocol !== 'https:' && !localReset) throw new Error('resend_reset_url_invalid');
  if (!/^#password-reset=[A-Za-z0-9_-]{43}$/.test(parsedResetUrl.hash)) throw new Error('resend_reset_token_invalid');

  const safeUrl = escapeHtml(parsedResetUrl.toString());
  const text = [
    'Recibimos una solicitud para cambiar la contraseña de tu cuenta BikeStore.',
    '',
    `Crea una nueva contraseña desde este enlace (vence en 30 minutos): ${parsedResetUrl.toString()}`,
    '',
    'Si no solicitaste el cambio, ignora este mensaje.'
  ].join('\n');
  const html = `<!doctype html><html lang="es"><body><p>Recibimos una solicitud para cambiar la contraseña de tu cuenta BikeStore.</p><p><a href="${safeUrl}">Crear una nueva contraseña</a></p><p>El enlace vence en 30 minutos. Si no solicitaste el cambio, ignora este mensaje.</p></body></html>`;
  const response = await fetchImpl(resolveResendEndpoint({ testMode, testEndpoint }), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      from: `BikeStore <${fromEmail}>`,
      to: [to],
      subject: 'Restablece tu contraseña de BikeStore',
      text,
      html
    })
  });
  if (!response?.ok) {
    try { await response?.body?.cancel(); } catch (_) {}
    throw new Error('resend_delivery_failed');
  }
  return true;
}
