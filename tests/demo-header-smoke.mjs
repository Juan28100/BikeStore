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
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

await access(chromiumPath).catch(() => {
  throw new Error(`Chromium no encontrado: ${chromiumPath}`);
});
const sourceHtml = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
const appScriptTag = '<script defer="" src="app.js"></script>';
assert.ok(sourceHtml.includes(appScriptTag), 'la prueba debe cargar la app.js real');
assert.doesNotMatch(sourceHtml, /class="demo-ribbon"/, 'la cinta de demo global ya no debe estar en el HTML');
assert.doesNotMatch(sourceHtml, /class="topline"/, 'la segunda franja global ya no debe estar en el HTML');
assert.match(sourceHtml, /Usa información ficticia\. No se enviará ni cobrará nada\./, 'el checkout conserva el aviso de envío/cobro');
assert.match(sourceHtml, /No ingreses datos bancarios\./, 'el pago simulado mantiene una advertencia explícita');
assert.match(sourceHtml, /No hay pasarela ni cargo\./, 'el checkout aclara que no procesa pagos');

const fixtureBootstrap = String.raw`(() => {
  const reply = (payload) => new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' }
  });
  window.fetch = async (input) => {
    const pathname = new URL(typeof input === 'string' ? input : input.url, location.origin).pathname;
    if (pathname === '/api/products') return reply({ products: [] });
    if (pathname === '/api/auth/session') return reply({ user: null });
    if (pathname === '/api/cart') return reply({ items: [] });
    return reply({});
  };
  const showResult = (status, detail) => {
    const element = document.getElementById('demo-header-smoke-result') || document.body.appendChild(document.createElement('pre'));
    element.id = 'demo-header-smoke-result';
    element.dataset.status = status;
    element.textContent = detail;
  };
  window.addEventListener('load', () => setTimeout(() => {
    try {
      const mobile = window.matchMedia('(max-width: 640px)').matches;
      const expectedMobile = new URL(location.href).searchParams.get('viewport') === 'mobile';
      const header = document.querySelector('.site-header');
      const menuButton = document.querySelector('.menu-button');
      const mainNav = document.querySelector('.main-nav');
      const checkout = document.getElementById('checkoutView');
      document.querySelectorAll('main > .view').forEach((view) => { view.hidden = view !== checkout; });
      checkout.hidden = false;
      const headerVisible = Boolean(header && getComputedStyle(header).display !== 'none' && header.getBoundingClientRect().height > 0);
      const responsiveControlVisible = mobile
        ? Boolean(menuButton && getComputedStyle(menuButton).display !== 'none' && menuButton.getBoundingClientRect().width > 0)
        : Boolean(mainNav && getComputedStyle(mainNav).display !== 'none' && mainNav.getBoundingClientRect().width > 0);
      const checkoutNotice = checkout.querySelector('.checkout-heading p:not(.eyebrow)');
      const paymentNotice = checkout.querySelector('.simulation-box');
      const checkoutNoticeVisible = Boolean(checkoutNotice && checkoutNotice.getBoundingClientRect().height > 0
        && checkoutNotice.textContent.includes('No se enviará ni cobrará nada'));
      const paymentNoticeVisible = Boolean(paymentNotice && paymentNotice.getBoundingClientRect().height > 0
        && paymentNotice.textContent.includes('No hay pasarela ni cargo'));
      const noGlobalBanner = !document.querySelector('.demo-ribbon, .topline');
      const checks = { viewportMatches: mobile === expectedMobile, headerVisible, responsiveControlVisible, noGlobalBanner, checkoutNoticeVisible, paymentNoticeVisible };
      const failures = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
      showResult(failures.length ? 'FAIL' : 'PASS', JSON.stringify({ viewportWidth: window.innerWidth, mobile, ...checks, failures }));
    } catch (error) {
      showResult('FAIL', error?.stack || String(error));
    }
  }, 300));
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
const results = [];
for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 500, 900]]) {
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${width},${height}`,
    '--virtual-time-budget=6000', '--dump-dom', `http://127.0.0.1:${address.port}/?viewport=${label}`
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
  const pass = stdout.includes('id="demo-header-smoke-result" data-status="PASS"');
  const failMatch = stdout.match(/<pre id="demo-header-smoke-result" data-status="FAIL">([^<]*)<\/pre>/);
  if (exitCode !== 0 || !pass) {
    await new Promise((resolve) => server.close(resolve));
    throw new Error(`${label}: ${failMatch ? failMatch[1] : 'No se recibió resultado PASS.'}\nChromium exit code: ${exitCode}\n${stderr.slice(-2000)}`);
  }
  const detailMatch = stdout.match(/<pre id="demo-header-smoke-result" data-status="PASS">([^<]*)<\/pre>/);
  results.push(`${label}: ${detailMatch?.[1] || 'PASS'}`);
}
await new Promise((resolve) => server.close(resolve));
for (const result of results) console.log(`PASS demo header/checkout smoke (${result})`);
console.log('PASS local-only: cinta global ausente, nota de pago/envío simulado visible, APIs en memoria');
