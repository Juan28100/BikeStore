import assert from 'node:assert/strict';

const base = (process.env.BIKESTORE_TEST_URL || '').replace(/\/$/, '');
assert.ok(base, 'BIKESTORE_TEST_URL is required');

const routes = [
  '/',
  '/catalogo?category=Bicicletas%20de%20monta%C3%B1a&q=trail',
  '/accesorios?category=Cascos%20y%20protecci%C3%B3n',
  '/producto/bike-r8-road?return=%2Fcatalogo%3Fsort%3Dasc',
  '/carrito?return=%2Faccesorios',
  '/checkout?return=%2Fcatalogo',
  '/admin'
];
let canonicalHtml = '';
for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  assert.equal(response.status, 200, `deep route must serve the SPA: ${route}`);
  assert.match(response.headers.get('content-type') || '', /text\/html/i, `deep route must return HTML: ${route}`);
  const html = await response.text();
  for (const id of ['homeView', 'catalogView', 'accessoriesView', 'productView', 'cartView', 'checkoutView', 'adminView']) {
    assert.ok(html.includes(`id="${id}"`), `SPA document must include ${id}`);
  }
  if (!canonicalHtml) canonicalHtml = html;
  else assert.equal(html, canonicalHtml, `all deep routes should use the same SPA shell: ${route}`);
}

const homeStart = canonicalHtml.indexOf('id="homeView"');
const catalogStart = canonicalHtml.indexOf('id="catalogView"');
const accessoriesStart = canonicalHtml.indexOf('id="accessoriesView"');
assert.ok(homeStart >= 0 && catalogStart > homeStart && accessoriesStart > catalogStart, 'Home, Catalog and Accessories must be separate sibling routes');
const homeMarkup = canonicalHtml.slice(homeStart, catalogStart);
assert.ok(homeMarkup.includes('id="inicio"') && homeMarkup.includes('id="featuredGrid"'), 'Home must retain its hero and featured products');
assert.ok(!homeMarkup.includes('id="productGrid"') && !homeMarkup.includes('category-card') && !homeMarkup.includes('service-section') && !homeMarkup.includes('home-shortcuts') && !homeMarkup.includes('demo-manifesto'), 'Home must not include the full catalog or extra service/category sections');
assert.ok(canonicalHtml.includes('id="accessoryProductGrid"') && !homeMarkup.includes('data-home-category'), 'dedicated accessory grid must be separate from Home');
assert.match(canonicalHtml, /id="adminNavLink"[^>]*hidden|hidden[^>]*id="adminNavLink"/, 'admin header link must be hidden before authentication');
assert.match(canonicalHtml, /<base href="\/"\s*\/?\s*>/i, 'root base is required for deep-route assets');

const appResponse = await fetch(`${base}/app.js`);
assert.equal(appResponse.status, 200, 'app.js must remain accessible at the root on deep routes');
const app = await appResponse.text();
assert.ok(app.includes("p.gear === true"), 'Accessories filtering must use the server product gear flag');
assert.ok(app.includes("products.filter((p) => p.active).slice().sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 4)"), 'Home recommendations must be capped at four products');
assert.ok(app.includes("adminLink.hidden = !isAdmin"), 'admin link visibility must depend on authenticated admin role');
assert.ok(app.includes("window.addEventListener('popstate'"), 'back/forward history must re-render the route');

const cssResponse = await fetch(`${base}/styles.css`);
assert.equal(cssResponse.status, 200, 'styles.css must remain accessible at the root on deep routes');
const css = await cssResponse.text();
assert.ok(css.includes('.accessories-banner'), 'the Accessories page needs its responsive visual styles');
assert.ok(css.includes('.page-search-field{display:flex'), 'mobile catalog/accessory search must be available');

const imageResponse = await fetch(`${base}/assets/bikestore/road-kit.jpg`);
assert.equal(imageResponse.status, 200, 'accessories banner image must be served');
assert.match(imageResponse.headers.get('content-type') || '', /image\//i, 'accessories banner must be served as an image');

console.log(`PASS navigation smoke: ${routes.length} direct routes, compact Home, Catalog/Accessories views, admin hidden, root assets and responsive styles`);
