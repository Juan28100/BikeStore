import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(projectRoot, 'public');
const chromiumPath = process.env.BIKESTORE_CHROMIUM_PATH || '/usr/bin/chromium';
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

await access(chromiumPath).catch(() => {
  throw new Error(`Chromium no encontrado: ${chromiumPath}`);
});
const sourceHtml = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
const appScriptTag = '<script defer="" src="app.js"></script>';
assert.ok(sourceHtml.includes(appScriptTag), 'la prueba debe cargar la interfaz real');

const fixtureBootstrap = String.raw`(() => {
  const product = {
    id: 'delete-ui-fixture',
    name: 'Producto local para eliminar',
    category: 'Accesorios',
    price: 99000,
    stock: 2,
    image: '/assets/bikestore/road-kit.jpg',
    description: 'Registro efímero del smoke test.',
    active: true,
    featured: false,
    flag: 'Prueba',
    gear: true
  };
  const admin = {
    id: 'fixture-admin',
    accountType: 'account',
    name: 'Admin local',
    email: 'admin@example.test',
    role: 'admin'
  };
  const result = { publicProductCount: null, adminRequests: 0, deleteRequests: 0, confirmMessage: '', confirmCalls: 0, confirmResponses: [false, true], activeAfterDelete: null };
  window.__adminProductDeleteSmoke = result;
  const reply = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
  window.confirm = (message) => {
    result.confirmMessage = String(message);
    result.confirmCalls += 1;
    return result.confirmResponses.shift() ?? true;
  };
  window.fetch = async (input, options = {}) => {
    const pathname = new URL(typeof input === 'string' ? input : input.url, location.origin).pathname;
    const method = String(options.method || 'GET').toUpperCase();
    if (pathname === '/api/products' && method === 'GET') {
      const products = product.active ? [{ ...product }] : [];
      result.publicProductCount = products.length;
      return reply({ products });
    }
    if (pathname === '/api/auth/session' && method === 'GET') return reply({ user: { ...admin } });
    if (pathname === '/api/admin/products' && method === 'GET') {
      result.adminRequests += 1;
      return reply({ products: [{ ...product }] });
    }
    if (pathname === '/api/admin/products/' + product.id && method === 'DELETE') {
      result.deleteRequests += 1;
      product.active = false;
      result.activeAfterDelete = product.active;
      return reply({ ok: true, deleted: product.id });
    }
    if (pathname === '/api/cart' && method === 'GET') return reply({ items: [], user: { ...admin } });
    if (pathname.startsWith('/api/')) return reply({});
    return reply({ error: 'Unexpected fixture request: ' + method + ' ' + pathname }, 404);
  };
  const waitFor = async (predicate, label, timeout = 6000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('Tiempo de espera agotado: ' + label);
  };
  const showResult = (status, detail) => {
    const element = document.getElementById('admin-product-delete-result') || document.body.appendChild(document.createElement('pre'));
    element.id = 'admin-product-delete-result';
    element.dataset.status = status;
    element.textContent = detail;
  };
  window.addEventListener('load', async () => {
    try {
      await waitFor(() => {
        const link = document.getElementById('adminNavLink');
        return link && !link.hidden;
      }, 'enlace admin autenticado con fixture local');
      document.getElementById('adminNavLink').click();
      await waitFor(() => {
        const button = document.querySelector('#adminProductRows [data-action="delete-product"]');
        return !document.getElementById('adminView').hidden && button;
      }, 'fila admin con botón eliminar');

      const remove = document.querySelector('#adminProductRows [data-action="delete-product"]');
      if (remove.textContent.trim() !== 'Eliminar') throw new Error('La acción debe llamarse Eliminar, no ' + remove.textContent.trim());
      if (remove.getAttribute('aria-label') !== 'Eliminar ' + product.name + ' del catálogo') throw new Error('El botón no tiene una etiqueta accesible específica');
      remove.click();
      await waitFor(() => result.confirmCalls === 1, 'confirmación de eliminación');
      if (result.deleteRequests !== 0 || !product.active) throw new Error('Cancelar debe dejar el producto intacto');
      remove.click();

      await waitFor(() => result.deleteRequests === 1 && result.confirmCalls === 2 && result.adminRequests >= 2 && result.publicProductCount === 0, 'DELETE simulado y actualización del catálogo/admin');
      await waitFor(() => {
        const row = document.querySelector('#adminProductRows tr');
        return row && row.querySelector('.state-pill.off')?.textContent === 'Inactivo'
          && !row.querySelector('[data-action="delete-product"]')
          && row.querySelector('[data-action="edit-product"]');
      }, 'producto inactivo conservado en el historial admin');
      await waitFor(() => document.getElementById('toast').textContent.includes('Producto eliminado del catálogo'), 'mensaje de resultado');

      if (!result.confirmMessage.includes('catálogo') || !result.confirmMessage.includes('carritos') || !result.confirmMessage.includes('historial de inventario')) {
        throw new Error('La confirmación debe explicar el alcance y la conservación del historial: ' + result.confirmMessage);
      }
      if (result.activeAfterDelete !== false || result.publicProductCount !== 0) throw new Error('El producto no quedó fuera del catálogo público');
      showResult('PASS', JSON.stringify({ button: 'Eliminar', confirmMessage: result.confirmMessage, cancelledWithoutMutation: true, deleteRequests: result.deleteRequests, publicProductCount: result.publicProductCount, adminStatusAfterDelete: 'Inactivo', historyPreserved: true }));
    } catch (error) {
      showResult('FAIL', error?.stack || String(error));
    }
  });
})();`;

const fixtureHtml = sourceHtml.replace(
  appScriptTag,
  '<script src="/__fixture-bootstrap.js"></script>\n<script defer="" src="app.js"></script>'
);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/__fixture-bootstrap.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(fixtureBootstrap);
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(fixtureHtml);
      return;
    }
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const filePath = path.resolve(publicRoot, relativePath);
    if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;
const args = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,900',
  '--virtual-time-budget=15000', '--dump-dom', url
];
let stdout = '';
let stderr = '';
const browser = spawn(chromiumPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
browser.stdout.setEncoding('utf8');
browser.stderr.setEncoding('utf8');
browser.stdout.on('data', (chunk) => { stdout += chunk; });
browser.stderr.on('data', (chunk) => { stderr += chunk; });
const timeout = setTimeout(() => browser.kill('SIGKILL'), 30000);
const exitCode = await new Promise((resolve, reject) => {
  browser.once('error', reject);
  browser.once('close', (code) => resolve(code));
});
clearTimeout(timeout);
await new Promise((resolve) => server.close(resolve));
const passMatch = stdout.match(/<pre id="admin-product-delete-result" data-status="PASS">([^<]*)<\/pre>/);
if (exitCode !== 0 || !passMatch) {
  const failMatch = stdout.match(/<pre id="admin-product-delete-result" data-status="FAIL">([^<]*)<\/pre>/);
  const pageResult = failMatch ? failMatch[1] : 'No pasó la prueba o Chromium no completó la carga.';
  throw new Error(`${pageResult}\nChromium exit code: ${exitCode}\n${stderr.slice(-2500)}`);
}
console.log(`PASS admin delete UI regression: ${passMatch[1]}`);
console.log('PASS isolated fixture: Chromium + API simulado en memoria, sin login real, D1 ni producción');
