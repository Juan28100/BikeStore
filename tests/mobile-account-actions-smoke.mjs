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
assert.ok(sourceHtml.includes(appScriptTag), 'la prueba debe cargar index.html y app.js reales');

const fixtureBootstrap = String.raw`(() => {
  const role = new URLSearchParams(location.search).get('fixtureRole') || 'visitor';
  const makeUser = (userRole) => userRole === 'visitor' ? null : ({
    id: 'fixture-' + userRole,
    accountType: 'account',
    name: userRole === 'admin' ? 'Admin móvil simulado' : 'Cliente móvil simulado',
    email: userRole === 'admin' ? 'admin@example.test' : 'customer@example.test',
    role: userRole
  });
  const fixture = { role, activeUser: makeUser(role), sessionRequests: 0, logoutRequests: 0 };
  window.__mobileAccountFixture = fixture;
  const nativeFetch = window.fetch.bind(window);
  const json = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    const method = String(options.method || 'GET').toUpperCase();
    if (url.pathname === '/api/products') return json({ products: [] });
    if (url.pathname === '/api/auth/session') {
      fixture.sessionRequests += 1;
      return json({ user: fixture.activeUser });
    }
    if (url.pathname === '/api/cart') return json({ items: [], user: fixture.activeUser });
    if (url.pathname === '/api/auth/logout' && method === 'POST') {
      fixture.logoutRequests += 1;
      fixture.activeUser = null;
      return json({ ok: true });
    }
    if (url.pathname.startsWith('/api/')) return json({});
    return nativeFetch(input, options);
  };
  const showResult = (status, detail) => {
    const element = document.getElementById('mobile-account-regression-result') || document.body.appendChild(document.createElement('pre'));
    element.id = 'mobile-account-regression-result';
    element.dataset.status = status;
    element.textContent = detail;
  };
  const waitFor = async (predicate, label, timeout = 5000) => {
    const started = Date.now();
    while (!predicate()) {
      if (Date.now() - started > timeout) throw new Error('Tiempo de espera agotado: ' + label);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  const isVisible = (element) => {
    if (!element || element.hidden) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  window.addEventListener('load', async () => {
    try {
      const viewport = { width: window.innerWidth, mobile: window.matchMedia('(max-width: 640px)').matches };
      if (!viewport.mobile) throw new Error('Chromium no está en breakpoint móvil: ' + JSON.stringify(viewport));
      const nav = document.querySelector('.main-nav');
      const menuButton = document.querySelector('[data-action="menu"]');
      const login = document.querySelector('.mobile-menu-login');
      const register = document.querySelector('.mobile-menu-register');
      const logout = document.querySelector('.mobile-menu-logout');
      const admin = document.getElementById('adminNavLink');
      const modal = document.getElementById('modalBackdrop');
      if (![nav, menuButton, login, register, logout, admin, modal].every(Boolean)) throw new Error('Falta un control de navegación/cuenta móvil');

      await waitFor(() => fixture.sessionRequests > 0, 'respuesta de sesión simulada');
      const isVisitorState = () => !login.hidden && !register.hidden && logout.hidden;
      const isAuthenticatedState = () => login.hidden && register.hidden && !logout.hidden;
      menuButton.click();
      if (getComputedStyle(nav).display !== 'flex' || menuButton.getAttribute('aria-expanded') !== 'true') {
        throw new Error('No se pudo abrir el menú móvil');
      }
      if (fixture.role === 'visitor') await waitFor(isVisitorState, 'acciones de visitante');
      else await waitFor(isAuthenticatedState, 'acción de cerrar sesión');

      if (fixture.role === 'visitor') {
        if (!isVisible(login) || !isVisible(register) || isVisible(logout)) throw new Error('Visitante: deben verse iniciar sesión y registrarse, no salir');
        if (!admin.hidden || isVisible(admin)) throw new Error('Visitante: el enlace admin debe seguir oculto');
        login.click();
        await waitFor(() => !modal.hidden, 'apertura del formulario de inicio de sesión');
        if (nav.classList.contains('menu-open') || menuButton.getAttribute('aria-expanded') !== 'false') throw new Error('El menú debe cerrarse al elegir iniciar sesión');
        document.querySelector('.modal-close').click();
        menuButton.click();
        register.click();
        await waitFor(() => !modal.hidden, 'apertura del formulario de registro');
        if (nav.classList.contains('menu-open') || menuButton.getAttribute('aria-expanded') !== 'false') throw new Error('El menú debe cerrarse al elegir registrarse');
        document.querySelector('.modal-close').click();
        menuButton.click();
      } else {
        if (isVisible(login) || isVisible(register) || !isVisible(logout)) throw new Error('Con sesión: debe verse cerrar sesión, no iniciar sesión/registro');
        if (fixture.role === 'admin' && !isVisible(admin)) throw new Error('Admin autenticado: debe conservarse el enlace Administración');
        if (fixture.role !== 'admin' && isVisible(admin)) throw new Error('Cliente: el enlace Administración debe seguir oculto');
        if (fixture.role === 'customer') {
          logout.click();
          await waitFor(() => fixture.logoutRequests === 1 && isVisitorState(), 'cambio de sesión a visitante tras salir');
          if (nav.classList.contains('menu-open') || menuButton.getAttribute('aria-expanded') !== 'false') throw new Error('El menú debe cerrarse al salir');
          if (!admin.hidden || isVisible(admin)) throw new Error('Tras salir, Administración debe volver a ocultarse');
          menuButton.click();
          if (!isVisible(login) || !isVisible(register) || isVisible(logout)) throw new Error('Tras salir deben volver iniciar sesión y registrarse');
        }
      }
      showResult('PASS', JSON.stringify({ role: fixture.role, viewport, loginVisible: isVisible(login), registerVisible: isVisible(register), logoutVisible: isVisible(logout), adminVisible: isVisible(admin), sessionRequests: fixture.sessionRequests, logoutRequests: fixture.logoutRequests }));
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
const baseUrl = `http://127.0.0.1:${address.port}/`;
const runBrowser = async (role) => {
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=500,844',
    '--virtual-time-budget=15000', '--dump-dom', `${baseUrl}?fixtureRole=${role}`
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
  const passMatch = stdout.match(/<pre id="mobile-account-regression-result" data-status="PASS">([^<]*)<\/pre>/);
  if (exitCode !== 0 || !passMatch) {
    const failMatch = stdout.match(/<pre id="mobile-account-regression-result" data-status="FAIL">([^<]*)<\/pre>/);
    throw new Error(`${role}: ${failMatch ? failMatch[1] : 'No pasó la prueba o Chromium no completó la carga.'}\nChromium exit code: ${exitCode}\n${stderr.slice(-2000)}`);
  }
  console.log(`PASS mobile account actions (${role}): ${passMatch[1]}`);
};

try {
  for (const role of ['visitor', 'customer', 'admin']) await runBrowser(role);
  console.log('PASS isolated mobile account fixtures: visitor, customer logout, admin-only link; all API responses stayed in memory');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
