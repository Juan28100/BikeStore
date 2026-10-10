import { createServer } from 'node:http';

const port = Number(process.argv[2]);
const controlToken = process.env.BIKESTORE_TEST_RESEND_CONTROL_TOKEN || '';
if (!Number.isInteger(port) || port < 1024 || port > 65535 || controlToken.length < 32) {
  throw new Error('Configuración local de mock inválida.');
}
const messages = [];

function send(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { ok: true });
  if (request.method === 'GET' && url.pathname === '/messages') {
    if (request.headers['x-test-control'] !== controlToken) return send(response, 404, { error: 'not_found' });
    return send(response, 200, { messages });
  }
  if (request.method !== 'POST' || url.pathname !== '/emails' || request.headers.authorization !== 'Bearer local-test-key') {
    return send(response, 401, { error: 'unauthorized' });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) return send(response, 413, { error: 'too_large' });
    chunks.push(chunk);
  }
  let message;
  try { message = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch (_) { return send(response, 400, { error: 'invalid_json' }); }
  if (message.from !== 'BikeStore <noreply@example.test>' || !Array.isArray(message.to) || typeof message.html !== 'string' || typeof message.text !== 'string') {
    return send(response, 400, { error: 'invalid_message' });
  }
  messages.push(message);
  return send(response, 200, { id: `local-message-${messages.length}` });
});

server.listen(port, '127.0.0.1', () => console.log('Local Resend stub ready.'));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
