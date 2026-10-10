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
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

await access(chromiumPath).catch(() => {
  throw new Error(`Chromium no encontrado: ${chromiumPath}`);
});
const sourceHtml = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
const appScriptTag = '<script defer="" src="app.js"></script>';
assert.ok(sourceHtml.includes(appScriptTag), 'la prueba debe cargar el app.js real');

const fixtureBootstrap = String.raw`(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ products: [], items: [], orders: [], user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return nativeFetch(input, options);
  };
  const showResult = (status, detail) => {
    const element = document.getElementById('mobile-menu-regression-result') || document.body.appendChild(document.createElement('pre'));
    element.id = 'mobile-menu-regression-result';
    element.dataset.status = status;
    element.textContent = detail;
  };
  window.addEventListener('load', () => {
    try {
      const viewport = { width: window.innerWidth, mobile: window.matchMedia('(max-width: 640px)').matches };
      if (!viewport.mobile) throw new Error('Chromium no está en breakpoint móvil: ' + JSON.stringify(viewport));
      const nav = document.querySelector('.main-nav');
      const button = document.querySelector('[data-action="menu"]');
      if (!nav || !button) throw new Error('Falta el menú o su botón');
      const displayBefore = getComputedStyle(nav).display;
      if (displayBefore !== 'none') throw new Error('El menú móvil debía iniciar cerrado; display=' + displayBefore);

      button.click();
      const displayOpen = getComputedStyle(nav).display;
      const expandedOpen = button.getAttribute('aria-expanded');
      const classOpen = nav.classList.contains('menu-open');
      const visibleLinks = [...nav.querySelectorAll('a.nav-link')].filter((link) => getComputedStyle(link).display !== 'none').length;
      if (expandedOpen !== 'true' || !classOpen) throw new Error('El handler no marcó el botón como abierto');
      if (displayOpen !== 'flex' || nav.getBoundingClientRect().height < 1 || visibleLinks < 1) {
        throw new Error('El handler sí cambia aria-expanded/clase, pero el menú continúa invisible: ' + JSON.stringify({ displayOpen, expandedOpen, classOpen, visibleLinks }));
      }

      nav.querySelector('a[data-route="/catalogo"]').click();
      const closedAfterNavigation = !nav.classList.contains('menu-open') && button.getAttribute('aria-expanded') === 'false';
      if (!closedAfterNavigation) throw new Error('El menú no se cerró después de elegir una ruta');
      showResult('PASS', JSON.stringify({ viewport, displayBefore, displayOpen, expandedOpen, visibleLinks, closedAfterNavigation }));
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
  '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=500,844',
  '--virtual-time-budget=10000', '--dump-dom', url
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
const passMatch = stdout.match(/<pre id="mobile-menu-regression-result" data-status="PASS">([^<]*)<\/pre>/);
if (exitCode !== 0 || !passMatch) {
  const failMatch = stdout.match(/<pre id="mobile-menu-regression-result" data-status="FAIL">([^<]*)<\/pre>/);
  const pageResult = failMatch ? failMatch[1] : 'No pasó la prueba o Chromium no completó la carga.';
  throw new Error(`${pageResult}\nChromium exit code: ${exitCode}\n${stderr.slice(-2500)}`);
}
console.log(`PASS mobile menu regression in Chromium: ${passMatch[1]}`);
console.log('PASS isolated fixture: viewport CSS móvil <=640px (Chromium reporta 500px), APIs simuladas en memoria, sin autenticación ni URL de producción');
