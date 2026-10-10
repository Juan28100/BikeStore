(() => {
  'use strict';

  const KEY = {
    products: 'noma-demo-products-v1', cart: 'noma-demo-cart-v1',
    orders: 'noma-demo-orders-v1', users: 'noma-demo-users-v1', favorites: 'noma-demo-favorites-v1'
  };
  const CATEGORIES = ['Bicicletas de montaña', 'Bicicletas de ruta', 'Bicicletas eléctricas', 'Cascos y protección', 'Ropa de ciclismo', 'Accesorios', 'Componentes y repuestos'];
  const IMG = (name) => `assets/bikestore/${name}.jpg`;
  const IMAGE_OPTIONS = ['bike-mountain', 'bike-kids', 'bike-city', 'bike-road-white', 'bike-trail-blue', 'bike-road', 'bike-hero', 'helmets', 'helmet-route', 'helmet-kids', 'apparel-set', 'apparel-jersey', 'apparel-black', 'road-kit', 'components', 'rear-light', 'lights', 'hero-ride'].map(IMG);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fmt = (value) => currency.format(Number.isFinite(Number(value)) ? Number(value) : 0);
  const dateFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const today = new Date();

  const DEFAULT_PRODUCTS = [
    { id: 'bike-scorpion-mtb', name: 'Scorpion MTB 29', category: 'Bicicletas de montaña', price: 899000, stock: 6, image: IMG('bike-mountain'), gallery: [IMG('bike-mountain'), IMG('bike-trail-blue'), IMG('bike-hero')], description: 'Bicicleta todo terreno para descubrir nuevos senderos con control y confianza.', active: true, featured: true, flag: 'Montaña', gear: false },
    { id: 'bike-r8-road', name: 'Bici Ruta R8-4720', category: 'Bicicletas de ruta', price: 5999000, stock: 4, image: IMG('bike-road'), gallery: [IMG('bike-road'), IMG('bike-road-white'), IMG('bike-city')], description: 'Bicicleta de ruta con cuadro ligero para rodadas largas y ritmo constante.', active: true, featured: true, flag: 'Ruta', gear: false },
    { id: 'bike-e-trail', name: 'E-Trail 29 Demo', category: 'Bicicletas eléctricas', price: 2849000, stock: 3, image: IMG('bike-hero'), gallery: [IMG('bike-hero'), IMG('bike-trail-blue')], description: 'Una bicicleta de muestra para explorar la categoría eléctrica; las especificaciones son ilustrativas.', active: true, featured: false, flag: 'Demo', gear: false },
    { id: 'helmet-vector-trail', name: 'Casco Trail Vector MIPS', category: 'Cascos y protección', price: 429000, stock: 12, image: IMG('helmets'), gallery: [IMG('helmets'), IMG('helmet-route'), IMG('helmet-kids')], description: 'Casco liviano con ventilación amplia y ajuste cómodo para tus recorridos.', active: true, featured: true, flag: 'Protección', gear: true },
    { id: 'helmet-bmx-kids', name: 'Casco BMX para niño', category: 'Cascos y protección', price: 150000, stock: 8, image: IMG('helmet-kids'), gallery: [IMG('helmet-kids'), IMG('helmet-route')], description: 'Protección cómoda para competencias, práctica y paseos en familia.', active: true, featured: false, flag: 'Niño', gear: true },
    { id: 'jersey-route-pro', name: 'Traje de ruta Pro', category: 'Ropa de ciclismo', price: 200000, stock: 9, image: IMG('apparel-set'), gallery: [IMG('apparel-set'), IMG('apparel-jersey'), IMG('apparel-black')], description: 'Conjunto de ciclismo de ajuste cómodo para entrenamientos y salidas de ruta.', active: true, featured: true, flag: 'Ruta', gear: true },
    { id: 'rear-light-led', name: 'Luz roja trasera', category: 'Accesorios', price: 89000, stock: 18, image: IMG('rear-light'), gallery: [IMG('rear-light'), IMG('lights'), IMG('road-kit')], description: 'Luz trasera de muestra para sumar visibilidad a tus recorridos.', active: true, featured: false, flag: 'Visibilidad', gear: true },
    { id: 'road-kit-mini', name: 'Kit de ruta y taller', category: 'Accesorios', price: 279000, stock: 7, image: IMG('road-kit'), gallery: [IMG('road-kit'), IMG('lights')], description: 'Accesorios básicos para llevar y resolver pequeños imprevistos en el camino.', active: true, featured: false, flag: 'Esencial', gear: true },
    { id: 'transmission-12v', name: 'Componentes transmisión 12v', category: 'Componentes y repuestos', price: 349000, stock: 5, image: IMG('components'), gallery: [IMG('components'), IMG('bike-mountain')], description: 'Componentes ilustrativos para actualización y mantenimiento de tu bicicleta.', active: true, featured: false, flag: 'Taller', gear: true }
  ];

  const DEFAULT_ORDERS = [
    { id: 'BIKE-DEMO-0261', date: '2026-10-08', items: [{ productId: 'bike-scorpion-mtb', name: 'Scorpion MTB 29', category: 'Bicicletas de montaña', quantity: 2, price: 899000 }] },
    { id: 'BIKE-DEMO-0260', date: '2026-10-07', items: [{ productId: 'helmet-vector-trail', name: 'Casco Trail Vector MIPS', category: 'Cascos y protección', quantity: 1, price: 429000 }, { productId: 'jersey-route-pro', name: 'Traje de ruta Pro', category: 'Ropa de ciclismo', quantity: 1, price: 200000 }] },
    { id: 'BIKE-DEMO-0259', date: '2026-10-05', items: [{ productId: 'bike-r8-road', name: 'Bici Ruta R8-4720', category: 'Bicicletas de ruta', quantity: 1, price: 5999000 }] },
    { id: 'BIKE-DEMO-0258', date: '2026-10-03', items: [{ productId: 'rear-light-led', name: 'Luz roja trasera', category: 'Accesorios', quantity: 2, price: 89000 }, { productId: 'transmission-12v', name: 'Componentes transmisión 12v', category: 'Componentes y repuestos', quantity: 1, price: 349000 }] },
    { id: 'BIKE-DEMO-0257', date: '2026-10-01', items: [{ productId: 'helmet-bmx-kids', name: 'Casco BMX para niño', category: 'Cascos y protección', quantity: 1, price: 150000 }] }
  ];

  const DEFAULT_USERS = [
    { id: 'demo-user-1', name: 'Camila Ejemplo', email: 'camila.ejemplo@demo.test', role: 'Cliente', active: true },
    { id: 'demo-user-2', name: 'Andrés Muestra', email: 'andres.muestra@demo.test', role: 'Cliente', active: true },
    { id: 'demo-user-3', name: 'Valentina Prueba', email: 'valentina.prueba@demo.test', role: 'Administrador demo', active: true },
    { id: 'demo-user-4', name: 'Mateo Ficticio', email: 'mateo.ficticio@demo.test', role: 'Cliente', active: false }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  };
  const safeImage = (value) => IMAGE_OPTIONS.includes(value) ? value : IMG('bike-mountain');
  const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.trunc(Number(value) || min)));

  function load(key, fallback, validator) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return clone(fallback);
      const parsed = JSON.parse(raw);
      if (!validator(parsed)) throw new Error('Invalid demo data');
      return parsed;
    } catch (_) {
      return clone(fallback);
    }
  }
  function cleanProducts(value) {
    if (!Array.isArray(value)) return null;
    const list = value.filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && /^[a-z0-9_-]{1,48}$/i.test(p.id) && typeof p.name === 'string' && typeof p.category === 'string' && CATEGORIES.includes(p.category) && Number.isFinite(Number(p.price)) && Number(p.price) >= 1000 && Number(p.price) <= 10000000 && Number.isFinite(Number(p.stock)) && Number(p.stock) >= 0 && Number(p.stock) <= 10000);
    return list.map((p) => ({
      id: p.id, name: p.name.slice(0, 80), category: p.category,
      price: Math.round(Number(p.price)), stock: clampInt(p.stock, 0, 10000),
      image: safeImage(p.image), gallery: Array.isArray(p.gallery) ? p.gallery.filter((image) => IMAGE_OPTIONS.includes(image)).slice(0, 5) : [safeImage(p.image)], description: typeof p.description === 'string' ? p.description.slice(0, 260) : '',
      active: p.active !== false, featured: Boolean(p.featured), flag: typeof p.flag === 'string' ? p.flag.slice(0, 30) : '',
      gear: Boolean(p.gear)
    }));
  }
  function cleanOrders(value) {
    if (!Array.isArray(value)) return null;
    return value.filter((o) => o && typeof o.id === 'string' && /^[-A-Z0-9]{4,48}$/i.test(o.id) && /^\d{4}-\d{2}-\d{2}$/.test(o.date) && Array.isArray(o.items)).map((o) => ({
      id: o.id.slice(0, 48), date: o.date,
      items: o.items.filter((i) => i && typeof i.name === 'string' && CATEGORIES.includes(i.category) && Number.isFinite(Number(i.price)) && Number(i.price) >= 0 && Number(i.price) <= 10000000).map((i) => ({
        productId: typeof i.productId === 'string' ? i.productId.slice(0, 48) : '', name: i.name.slice(0, 80),
        category: i.category, quantity: clampInt(i.quantity, 1, 99), price: Math.round(Number(i.price)), variant: typeof i.variant === 'string' ? i.variant.slice(0, 24) : ''
      }))
    }));
  }
  function cleanUsers(value) {
    if (!Array.isArray(value)) return null;
    return value.filter((u) => u && typeof u.id === 'string' && typeof u.name === 'string' && typeof u.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) && ['Cliente', 'Administrador demo'].includes(u.role)).map((u) => ({
      id: u.id.slice(0, 48), name: u.name.slice(0, 80), email: u.email.slice(0, 120), role: u.role, active: u.active !== false
    }));
  }

  let products = [];
  let cart = [];
  let currentUser = null;
  let backendReady = false;
  let orders = cleanOrders(load(KEY.orders, DEFAULT_ORDERS, (v) => cleanOrders(v) !== null)) || clone(DEFAULT_ORDERS);
  if (!orders.length || orders.every((order) => !order.items.length)) orders = clone(DEFAULT_ORDERS);
  let users = cleanUsers(load(KEY.users, DEFAULT_USERS, (v) => cleanUsers(v) !== null)) || clone(DEFAULT_USERS);
  let favorites = load(KEY.favorites, [], Array.isArray).filter((v) => typeof v === 'string' && /^[a-z0-9_-]{1,48}$/i.test(v));
  let selectedVariant = '';
  let currentAdminTab = 'overview';
  let lastBrowseUrl = '/catalogo';
  let toastTimer;
  let lastModalTrigger = null;

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { showToast('No se pudo guardar en este navegador.'); }
  }
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(`/api${path}`, {
      method: options.method || 'GET', credentials: 'same-origin', headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo conectar con el servidor.');
    return data;
  }
  function updateAccountHeader() {
    const button = $('.account-button');
    const logout = $('#logoutButton');
    if (!button) return;
    const isAdmin = currentUser?.role === 'admin';
    document.body.classList.toggle('admin-session', isAdmin);
    button.textContent = currentUser ? 'Mi cuenta' : 'Iniciar sesión';
    button.title = currentUser?.email || 'Iniciar sesión';
    button.hidden = isAdmin;
    if (logout) logout.hidden = !currentUser;
    const register = $('.header-register');
    if (register) register.hidden = Boolean(currentUser);
    const adminLink = $('#adminNavLink');
    if (adminLink) adminLink.hidden = !isAdmin;
  }
  function applyServerCart(data) {
    cart = Array.isArray(data.items) ? data.items.filter((item) => item && typeof item.productId === 'string').map((item) => ({
      productId: item.productId, quantity: clampInt(item.quantity, 1, 100), variant: typeof item.variant === 'string' ? item.variant : ''
    })) : [];
    currentUser = data.user?.accountType === 'account' ? data.user : null;
    updateAccountHeader();
  }
  async function syncBackend() {
    const wasAdmin = currentUser?.role === 'admin';
    try {
      const catalog = await apiRequest('/products');
      products = cleanProducts(catalog.products) || [];
      const session = await apiRequest('/auth/session');
      currentUser = session.user?.accountType === 'account' ? session.user : null;
      updateAccountHeader();
      if (currentUser?.role === 'admin') {
        cart = [];
        backendReady = true;
        renderProducts(); renderCart();
        setView('admin');
        return true;
      }
      const serverCart = await apiRequest('/cart');
      applyServerCart(serverCart);
      backendReady = true;
      renderProducts(); renderCart(); refreshAdmin();
      if (wasAdmin) setView('store');
      else renderRoute({ scroll: false });
      return true;
    } catch (error) {
      backendReady = false; products = []; cart = []; currentUser = null;
      updateAccountHeader(); renderProducts(); renderCart();
      if (wasAdmin) setView('store');
      else renderRoute({ scroll: false });
      showToast(error.message || 'No se pudo conectar con la tienda.');
      return false;
    }
  }
  function escapeCsv(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }
  function totalUnits() { return cart.reduce((sum, item) => sum + clampInt(item.quantity, 1, 99), 0); }
  function productFor(id) { return products.find((p) => p.id === id); }
  function getLines() {
    const lines = [];
    let changed = false;
    const normalized = [];
    for (const item of cart) {
      const product = productFor(item.productId);
      if (!product || !product.active || product.stock < 1) { changed = true; continue; }
      const quantity = Math.min(clampInt(item.quantity, 1, 99), product.stock);
      if (quantity !== item.quantity) changed = true;
      normalized.push({ productId: product.id, quantity, variant: item.variant || '' });
      lines.push({ product, quantity, subtotal: product.price * quantity, variant: item.variant || '' });
    }
    if (changed) cart = normalized;
    return lines;
  }
  function cartTotal() { return getLines().reduce((sum, line) => sum + line.subtotal, 0); }
  function stockText(product) {
    if (product.stock < 1) return ['Agotado', 'low'];
    if (product.stock < 5) return ['Últimas unidades', 'low'];
    return ['Disponible', ''];
  }
  function escapeText(value) { return String(value ?? '').slice(0, 200); }

  function renderFilters(scope = 'catalog') {
    const accessoriesOnly = scope === 'accessories';
    const wrap = accessoriesOnly ? $('#accessoryCategoryFilters') : $('#categoryFilters');
    if (!wrap) return;
    const route = parseRoute();
    const requested = route.query.get('category') || 'Todos';
    const available = CATEGORIES.filter((name) => products.some((p) => p.active && (!accessoriesOnly || p.gear === true) && p.category === name));
    const options = ['Todos', ...available];
    const selected = options.includes(requested) ? requested : 'Todos';
    wrap.replaceChildren();
    options.forEach((name) => {
      const button = node('button', `filter-chip${selected === name ? ' active' : ''}`, name);
      button.type = 'button'; button.dataset.category = name; button.dataset.filterScope = scope;
      button.setAttribute('aria-pressed', String(selected === name));
      wrap.append(button);
    });
  }
  function productCard(product, featured = false) {
    const card = node('article', 'product-card');
    const imageWrap = node('div', 'product-image-wrap');
    const image = node('img', 'product-image');
    image.src = safeImage(product.image); image.alt = escapeText(product.name); image.loading = 'lazy';
    imageWrap.append(image);
    if (product.flag) imageWrap.append(node('span', 'product-flag', product.flag));
    const favorite = node('button', `heart-button${favorites.includes(product.id) ? ' is-favorite' : ''}`, favorites.includes(product.id) ? '♥' : '♡');
    favorite.type = 'button'; favorite.dataset.action = 'favorite'; favorite.dataset.productId = product.id;
    favorite.setAttribute('aria-label', favorites.includes(product.id) ? 'Quitar de favoritos' : 'Guardar en favoritos');
    imageWrap.append(favorite);
    const add = node('button', 'quick-add', featured ? '+' : product.stock ? '+ Agregar' : 'Agotado');
    add.type = 'button'; add.dataset.action = 'add-cart'; add.dataset.productId = product.id; add.disabled = product.stock < 1;
    add.setAttribute('aria-label', product.stock ? `Agregar ${product.name} al carrito` : `${product.name}: agotado`);
    imageWrap.append(add); card.append(imageWrap);
    const info = node('div', 'product-info');
    const meta = node('div', 'product-meta');
    meta.append(node('span', 'product-category', product.category));
    const stock = stockText(product); meta.append(node('span', `product-stock ${stock[1]}`.trim(), stock[0]));
    info.append(meta, node('h3', '', product.name));
    if (product.description) info.append(node('p', 'product-description', product.description));
    const bottom = node('div', 'product-bottom');
    const price = node('span', 'product-price', fmt(product.price)); price.append(node('small', '', 'COP'));
    const detail = node('button', 'product-open', 'Ver detalle ↗');
    detail.type = 'button'; detail.dataset.action = 'product-detail'; detail.dataset.productId = product.id;
    bottom.append(price, detail); info.append(bottom); card.append(info);
    return card;
  }
  function renderFeatured() {
    const grid = $('#featuredGrid');
    if (!grid) return;
    const list = products.filter((p) => p.active).slice().sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 4);
    grid.replaceChildren(...list.map((product) => productCard(product, true)));
  }
  function renderProductGrid(scope = 'catalog') {
    const accessoriesOnly = scope === 'accessories';
    const grid = accessoriesOnly ? $('#accessoryProductGrid') : $('#productGrid');
    const empty = accessoriesOnly ? $('#emptyAccessories') : $('#emptyProducts');
    const count = accessoriesOnly ? $('#accessoryResultCount') : $('#resultCount');
    if (!grid || !empty || !count) return;
    const route = parseRoute();
    const requestedCategory = route.query.get('category') || 'Todos';
    const availableCategories = CATEGORIES.filter((name) => products.some((p) => p.active && (!accessoriesOnly || p.gear === true) && p.category === name));
    const categoryFilter = requestedCategory === 'Todos' || availableCategories.includes(requestedCategory) ? requestedCategory : 'Todos';
    const search = (route.query.get('q') || '').trim().toLocaleLowerCase('es');
    const sort = route.query.get('sort') || 'featured';
    const availability = ['all', 'available', 'soldout'].includes(route.query.get('availability')) ? route.query.get('availability') : 'all';
    let list = products.filter((p) => p.active && (!accessoriesOnly || p.gear === true)
      && (categoryFilter === 'Todos' || p.category === categoryFilter)
      && (!search || `${p.name} ${p.category} ${p.description}`.toLocaleLowerCase('es').includes(search))
      && (availability === 'all' || (availability === 'available' ? p.stock > 0 : p.stock === 0)));
    if (sort === 'asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'desc') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(b.featured) - Number(a.featured));
    count.textContent = `${list.length} ${list.length === 1 ? 'producto' : 'productos'}`;
    empty.hidden = list.length !== 0;
    grid.hidden = list.length === 0;
    grid.replaceChildren(...list.map(productCard));
    renderFilters(scope);
  }
  function renderProducts() {
    renderProductGrid('catalog');
    renderProductGrid('accessories');
    renderFeatured();
  }
  function renderCart() {
    const lines = getLines();
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    $('#bagCount').textContent = String(count);
    $('#drawerCount').textContent = `(${count})`;
    $('#cartItems').replaceChildren();
    $('#cartEmpty').classList.toggle('is-visible', lines.length === 0);
    $('#drawerFooter').hidden = lines.length === 0;
    lines.forEach(({ product, quantity, subtotal, variant }) => {
      const row = node('article', 'cart-item');
      const image = node('img'); image.src = safeImage(product.image); image.alt = ''; image.loading = 'lazy'; row.append(image);
      const body = node('div'); body.append(node('p', 'cart-item-name', product.name));
      if (variant) body.append(node('small', 'cart-item-variant', `Talla / variante: ${variant}`));
      body.append(node('span', 'cart-item-price', fmt(product.price)));
      const controls = node('div', 'cart-item-controls');
      const counter = node('div', 'quantity-control');
      const minus = node('button', '', '−'); minus.type = 'button'; minus.dataset.action = 'quantity'; minus.dataset.delta = '-1'; minus.dataset.productId = product.id; minus.dataset.variant = variant || ''; minus.setAttribute('aria-label', `Disminuir ${product.name}`);
      const quantityNode = node('span', '', quantity);
      const plus = node('button', '', '+'); plus.type = 'button'; plus.dataset.action = 'quantity'; plus.dataset.delta = '1'; plus.dataset.productId = product.id; plus.dataset.variant = variant || ''; plus.setAttribute('aria-label', `Aumentar ${product.name}`); plus.disabled = quantity >= product.stock;
      counter.append(minus, quantityNode, plus);
      const remove = node('button', 'remove-item', 'Quitar'); remove.type = 'button'; remove.dataset.action = 'remove-cart'; remove.dataset.productId = product.id; remove.dataset.variant = variant || '';
      controls.append(counter, remove); body.append(controls);
      row.append(body, node('span', 'cart-item-total', fmt(subtotal))); $('#cartItems').append(row);
    });
    $('#cartSubtotal').textContent = fmt(lines.reduce((sum, line) => sum + line.subtotal, 0));
    renderCartPage(lines);
  }
  function renderCartPage(lines = getLines()) {
    const items = $('#cartPageItems');
    if (!items) return;
    items.replaceChildren();
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    $('#cartPageCount').textContent = `${count} ${count === 1 ? 'producto' : 'productos'}`;
    $('#cartPageSubtotalLabel').textContent = `Subtotal (${count} ${count === 1 ? 'producto' : 'productos'})`;
    const empty = lines.length === 0;
    $('#cartPageEmpty').hidden = !empty;
    $('.cart-list-head').hidden = empty;
    $('.continue-link').hidden = empty;
    $('.cart-order-summary .button-wide').disabled = empty;
    lines.forEach(({ product, quantity, subtotal, variant }) => {
      const row = node('article', 'cart-page-item');
      const image = node('img', 'cart-page-image'); image.src = safeImage(product.image); image.alt = ''; image.loading = 'lazy'; row.append(image);
      const detail = node('div', 'cart-page-product'); detail.append(node('strong', '', product.name));
      if (variant) detail.append(node('small', 'cart-item-variant', `Talla / variante: ${variant}`));
      detail.append(node('small', '', fmt(product.price) + ' / unidad'));
      const controls = node('div', 'cart-page-controls'); const counter = node('div', 'quantity-control');
      const minus = node('button', '', '−'); minus.type = 'button'; minus.dataset.action = 'quantity'; minus.dataset.delta = '-1'; minus.dataset.productId = product.id; minus.dataset.variant = variant || ''; minus.setAttribute('aria-label', `Disminuir ${product.name}`);
      const value = node('span', '', quantity);
      const plus = node('button', '', '+'); plus.type = 'button'; plus.dataset.action = 'quantity'; plus.dataset.delta = '1'; plus.dataset.productId = product.id; plus.dataset.variant = variant || ''; plus.disabled = quantity >= product.stock; plus.setAttribute('aria-label', `Aumentar ${product.name}`);
      counter.append(minus, value, plus); controls.append(counter);
      const remove = node('button', 'remove-item', 'Quitar'); remove.type = 'button'; remove.dataset.action = 'remove-cart'; remove.dataset.productId = product.id; remove.dataset.variant = variant || ''; controls.append(remove);
      row.append(detail, controls, node('strong', 'cart-page-total', fmt(subtotal))); items.append(row);
    });
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    $('#pageCartSubtotal').textContent = fmt(total); $('#pageCartTotal').textContent = fmt(total);
  }
  async function addToCart(id, amount = 1, variant = '') {
    const product = productFor(id);
    if (!backendReady) { showToast('La tienda no está conectada al servidor.'); return false; }
    if (!product || !product.active || product.stock < 1) { showToast('Este producto está agotado o inactivo.'); return false; }
    try {
      const data = await apiRequest('/cart/items', { method: 'POST', body: { productId: id, quantity: amount, variant: variant || '' } });
      applyServerCart(data); renderCart(); showToast(`Se agregó ${product.name} al carrito.`); return true;
    } catch (error) { showToast(error.message); await syncBackend(); return false; }
  }
  async function changeQuantity(id, delta, variant = '') {
    const item = cart.find((entry) => entry.productId === id && (entry.variant || '') === (variant || '')); const product = productFor(id);
    if (!item || !product || !backendReady) return;
    const quantity = clampInt(item.quantity + delta, 1, Math.min(100, product.stock));
    try {
      const data = await apiRequest('/cart/items', { method: 'PUT', body: { productId: id, quantity, variant: variant || '' } });
      applyServerCart(data); renderCart();
    } catch (error) { showToast(error.message); await syncBackend(); }
  }
  async function removeFromCart(id, variant = '') {
    if (!backendReady) return;
    try {
      const query = new URLSearchParams({ productId: id, variant: variant || '' });
      const data = await apiRequest(`/cart/items?${query}`, { method: 'DELETE' });
      applyServerCart(data); renderCart();
    } catch (error) { showToast(error.message); }
  }
  function openCart() {
    const drawer = $('#cartDrawer'), overlay = $('#overlay');
    renderCart(); drawer.inert = false; drawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false; requestAnimationFrame(() => { drawer.classList.add('open'); overlay.classList.add('open'); });
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('.close-button', drawer)?.focus(), 50);
  }
  function closeCart() {
    const drawer = $('#cartDrawer'), overlay = $('#overlay');
    drawer.classList.remove('open'); overlay.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true;
    document.body.style.overflow = '';
    setTimeout(() => { overlay.hidden = true; }, 220);
  }
  function parseRoute() {
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    const query = new URLSearchParams(window.location.search);
    if (pathname === '/' || pathname === '/index.html') return { name: 'home', path: '/', query };
    if (pathname === '/catalogo') return { name: 'catalog', path: pathname, query };
    if (pathname === '/accesorios') return { name: 'accessories', path: pathname, query };
    if (pathname === '/carrito') return { name: 'cart', path: pathname, query };
    if (pathname === '/checkout') return { name: 'checkout', path: pathname, query };
    if (pathname === '/confirmacion') return { name: 'success', path: pathname, query };
    if (pathname === '/admin') return { name: 'admin', path: pathname, query };
    const productMatch = pathname.match(/^\/producto\/([a-z0-9_-]{1,80})$/i);
    if (productMatch) return { name: 'product', path: pathname, query, productId: productMatch[1] };
    return { name: 'home', path: '/', query, unknown: pathname !== '/' };
  }
  function routeHref(path, params = {}) {
    const query = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();
    if (!(params instanceof URLSearchParams) && params) Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && String(value) !== '') query.set(key, String(value)); });
    const serialized = query.toString();
    return `${path}${serialized ? `?${serialized}` : ''}`;
  }
  function safeBrowseUrl(value) {
    try {
      const url = new URL(String(value || '/catalogo'), window.location.origin);
      if (url.origin !== window.location.origin || !['/', '/catalogo', '/accesorios'].includes(url.pathname)) return '/catalogo';
      const params = new URLSearchParams();
      ['q', 'category', 'sort', 'availability'].forEach((key) => { const value = url.searchParams.get(key); if (value) params.set(key, value); });
      return routeHref(url.pathname, params);
    } catch (_) { return '/catalogo'; }
  }
  function currentBrowseUrl() {
    const route = parseRoute();
    if (['home', 'catalog', 'accessories'].includes(route.name)) return safeBrowseUrl(`${window.location.pathname}${window.location.search}`);
    if (['product', 'cart', 'checkout', 'success'].includes(route.name)) return safeBrowseUrl(route.query.get('return') || lastBrowseUrl);
    return lastBrowseUrl || '/catalogo';
  }
  function navigateTo(path, params = {}, options = {}) {
    const href = routeHref(path, params);
    const current = `${window.location.pathname}${window.location.search}`;
    closeCart();
    if (href !== current) history[options.replace ? 'replaceState' : 'pushState']({ bikeStoreRoute: true }, '', href);
    renderRoute({ scroll: options.scroll !== false });
  }
  function updateRouteFilters(changes, scope) {
    const route = parseRoute();
    const accessoriesOnly = scope === 'accessories' || route.name === 'accessories';
    const path = accessoriesOnly ? '/accesorios' : '/catalogo';
    const params = ['catalog', 'accessories'].includes(route.name) ? new URLSearchParams(route.query) : new URLSearchParams();
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'Todos' || value === 'featured' || value === 'all') params.delete(key);
      else params.set(key, String(value));
    });
    navigateTo(path, params, { replace: true, scroll: false });
  }
  function handleSearchInput(event) {
    const query = event.currentTarget.value.trim();
    const route = parseRoute();
    if (route.name === 'home') {
      if (query) navigateTo('/catalogo', { q: query });
      return;
    }
    const path = route.name === 'accessories' ? '/accesorios' : '/catalogo';
    if (!['catalog', 'accessories'].includes(route.name)) navigateTo(path, query ? { q: query } : {});
    else updateRouteFilters({ q: query }, route.name === 'accessories' ? 'accessories' : 'catalog');
  }
  function renderRoute(options = {}) {
    let route = parseRoute();
    if (route.unknown) { history.replaceState({ bikeStoreRoute: true }, '', '/'); route = parseRoute(); }
    if (route.name === 'admin' && currentUser?.role !== 'admin') {
      history.replaceState({ bikeStoreRoute: true }, '', '/'); route = parseRoute();
      renderAccount('login'); showToast('Inicia sesión con la cuenta administradora para continuar.');
    } else if (currentUser?.role === 'admin' && route.name !== 'admin') {
      history.replaceState({ bikeStoreRoute: true }, '', '/admin'); route = parseRoute();
    }
    if (route.name === 'product' && !backendReady) return;
    if (route.name === 'product' && !productFor(route.productId)) {
      history.replaceState({ bikeStoreRoute: true }, '', '/catalogo'); route = parseRoute();
    }
    const viewIds = { home: 'homeView', catalog: 'catalogView', accessories: 'accessoriesView', product: 'productView', cart: 'cartView', checkout: 'checkoutView', success: 'successView', admin: 'adminView' };
    Object.entries(viewIds).forEach(([name, id]) => { const view = $(`#${id}`); if (view) view.hidden = name !== route.name; });
    $('.site-footer').hidden = route.name === 'admin';
    const activePath = ['home', 'catalog', 'accessories'].includes(route.name) ? route.path : new URL(currentBrowseUrl(), window.location.origin).pathname;
    $$('.main-nav [data-route]').forEach((item) => {
      const itemPath = new URL(item.getAttribute('href') || '/', window.location.origin).pathname;
      item.classList.toggle('active', itemPath === activePath);
    });
    const adminLink = $('#adminNavLink');
    if (adminLink) adminLink.classList.toggle('active', route.name === 'admin');
    if (['home', 'catalog', 'accessories'].includes(route.name)) {
      lastBrowseUrl = safeBrowseUrl(`${window.location.pathname}${window.location.search}`);
      const search = $('#searchInput'); if (search) search.value = route.query.get('q') || '';
      const catalogSearch = $('#catalogSearchInput'); if (catalogSearch) catalogSearch.value = route.query.get('q') || '';
      const accessorySearch = $('#accessorySearchInput'); if (accessorySearch) accessorySearch.value = route.query.get('q') || '';
      const sort = route.query.get('sort') || 'featured';
      const availability = route.query.get('availability') || 'all';
      const catalogSort = $('#sortSelect'); if (catalogSort) catalogSort.value = sort;
      const accessorySort = $('#accessorySortSelect'); if (accessorySort) accessorySort.value = sort;
      const catalogAvailability = $('#catalogAvailability'); if (catalogAvailability) catalogAvailability.value = availability;
      const accessoryAvailability = $('#accessoryAvailability'); if (accessoryAvailability) accessoryAvailability.value = availability;
    }
    renderProducts();
    if (route.name === 'product') renderProductDetail(route.productId);
    if (route.name === 'cart') renderCartPage();
    if (route.name === 'checkout') renderCheckout();
    if (route.name === 'admin') { showAdminTab('products'); refreshAdmin(); }
    if (options.scroll !== false) {
      if (window.location.hash === '#demo-note') $('#demo-note')?.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  function setView(name) {
    closeModal();
    if (name === 'cart') { navigateTo('/carrito', { return: currentBrowseUrl() }); return; }
    if (name === 'checkout') { navigateTo('/checkout', { return: currentBrowseUrl() }); return; }
    if (name === 'admin') { currentAdminTab = 'products'; navigateTo('/admin'); return; }
    if (name === 'product') return;
    if (name === 'success') { navigateTo('/confirmacion', { return: currentBrowseUrl() }); return; }
    if (name === 'catalog') { navigateTo('/catalogo'); return; }
    if (name === 'accessories') { navigateTo('/accesorios'); return; }
    navigateTo('/');
  }
  function renderCheckout() {
    const lines = getLines();
    if (!lines.length) { setView('store'); showToast('Tu bolsa está vacía.'); return; }
    const items = $('#checkoutItems'); items.replaceChildren();
    lines.forEach(({ product, quantity, subtotal, variant }) => {
      const line = node('div', 'checkout-line'); const image = node('img'); image.src = safeImage(product.image); image.alt = '';
      const detail = node('div'); detail.append(node('strong', '', product.name));
      if (variant) detail.append(node('small', '', `Talla / variante: ${variant}`));
      detail.append(node('small', '', `${quantity} × ${fmt(product.price)}`));
      line.append(image, detail, node('span', '', fmt(subtotal))); items.append(line);
    });
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    $('#checkoutItemCount').textContent = `${lines.reduce((sum, line) => sum + line.quantity, 0)} productos`;
    $('#checkoutSubtotal').textContent = fmt(total); $('#checkoutTotal').textContent = fmt(total);
    $('#checkoutError').hidden = true; $('#checkoutForm').reset();
  }
  function makeOrderId() {
    const rand = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase();
    return `BK-DEMO-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }
  async function submitDemoOrder(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const lines = getLines();
    if (!lines.length) { setView('store'); showToast('Tu bolsa está vacía.'); return; }
    const date = new Date().toISOString().slice(0, 10);
    const order = { id: makeOrderId(), date, items: lines.map(({ product, quantity, variant }) => ({ productId: product.id, name: product.name, category: product.category, quantity, price: product.price, variant: variant || '' })) };
    try {
      const cleared = await apiRequest('/cart', { method: 'DELETE' });
      applyServerCart(cleared); renderCart();
    } catch (error) { showToast(error.message); return; }
    orders.unshift(order); save(KEY.orders, orders.slice(0, 150));
    $('#successOrderNo').textContent = order.id;
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    $('#successSummary').textContent = `${order.items.reduce((sum, item) => sum + item.quantity, 0)} artículo(s) · total ilustrativo ${fmt(total)}. Los datos de contacto y dirección no se guardaron.`;
    setView('success');
  }

  function showModal(content) {
    lastModalTrigger = document.activeElement;
    const heading = content.querySelector('h2');
    if (heading) heading.id = 'modalTitle';
    const backdrop = $('#modalBackdrop'); $('#modalContent').replaceChildren(content);
    backdrop.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => $('.modal-close')?.focus(), 30);
  }
  function closeModal() {
    const backdrop = $('#modalBackdrop');
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true; document.body.style.overflow = '';
    if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') lastModalTrigger.focus();
  }
  function modalFormLabel(text, name, type = 'text', options = {}) {
    const label = node('label', '', text);
    const input = node(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.name = name; input.required = options.required !== false;
    if (options.minlength) input.minLength = options.minlength;
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.autocomplete) input.autocomplete = options.autocomplete;
    label.append(input); return label;
  }
  function renderAccount(tab = 'login') {
    if (!['login', 'register'].includes(tab)) tab = 'login';
    const box = node('div');
    box.append(node('p', 'eyebrow', 'CUENTA BIKESTORE'), node('h2', '', tab === 'register' ? 'Crear cuenta' : 'Hola, de nuevo'), node('p', 'modal-intro', 'El catálogo puede explorarse sin cuenta. Si inicias sesión, tu carrito se asociará a tu cuenta.'));
    const tabs = node('div', 'modal-tabs');
    [['login', 'Ingresar'], ['register', 'Registrarme']].forEach(([key, label]) => { const b = node('button', `modal-tab${tab === key ? ' active' : ''}`, label); b.type = 'button'; b.dataset.accountTab = key; tabs.append(b); }); box.append(tabs);
    const form = node('form', 'modal-form'); form.noValidate = true; form.dataset.accountForm = tab;
    if (tab === 'register') form.append(modalFormLabel('Nombre', 'name', 'text', { minlength: 2, autocomplete: 'name', placeholder: 'Tu nombre' }));
    form.append(modalFormLabel('Correo electrónico', 'email', 'email', { autocomplete: 'email', placeholder: 'nombre@ejemplo.com' }));
    form.append(modalFormLabel('Contraseña', 'password', 'password', { minlength: 8, autocomplete: tab === 'register' ? 'new-password' : 'current-password', placeholder: 'Mínimo 8 caracteres' }));
    if (tab === 'login') {
      const forgot = node('button', 'text-button', '¿Olvidaste tu contraseña?');
      forgot.type = 'button'; forgot.dataset.action = 'forgot-password'; form.append(forgot);
    }
    const submit = node('button', 'button button-dark button-wide', tab === 'register' ? 'Crear cuenta' : 'Iniciar sesión'); submit.type = 'submit'; form.append(submit);
    const errorLine = node('p', 'form-error'); errorLine.hidden = true; errorLine.setAttribute('role', 'alert'); form.append(errorLine);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      errorLine.hidden = true; submit.disabled = true;
      const fields = form.elements;
      try {
        const isRegister = tab === 'register';
        await apiRequest(isRegister ? '/auth/register' : '/auth/login', {
          method: 'POST', body: { name: isRegister ? fields.name.value.trim() : undefined, email: fields.email.value.trim(), password: fields.password.value }
        });
        await syncBackend(); closeModal();
        showToast(isRegister ? 'Cuenta creada; el carrito quedó asociado.' : 'Sesión iniciada; se sincronizó tu carrito.');
        if (currentUser?.role === 'admin') setView('admin');
      } catch (error) {
        errorLine.textContent = error.message; errorLine.hidden = false;
      } finally { submit.disabled = false; }
    });
    box.append(form, node('p', 'modal-hint', 'Usa una contraseña única. La contraseña se almacena como hash; no compartas contraseñas de otros servicios.'));
    showModal(box);
  }
  function renderPasswordResetRequest() {
    const box = node('div');
    box.append(node('p', 'eyebrow', 'RECUPERAR CUENTA'), node('h2', '', 'Restablecer contraseña'), node('p', 'modal-intro', 'Escribe el correo de tu cuenta. Si existe una cuenta con ese correo, enviaremos instrucciones.'));
    const form = node('form', 'modal-form'); form.noValidate = true;
    form.append(modalFormLabel('Correo electrónico', 'email', 'email', { autocomplete: 'email', placeholder: 'nombre@ejemplo.com' }));
    const submit = node('button', 'button button-dark button-wide', 'Enviar instrucciones'); submit.type = 'submit'; form.append(submit);
    const errorLine = node('p', 'form-error'); errorLine.hidden = true; errorLine.setAttribute('role', 'alert'); form.append(errorLine);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true; errorLine.hidden = true;
      try {
        const result = await apiRequest('/auth/password-reset/request', { method: 'POST', body: { email: form.elements.email.value.trim() } });
        const done = node('div', 'modal-hint', result.message || 'Si el correo corresponde a una cuenta, recibirás instrucciones para cambiar la contraseña.');
        form.replaceWith(done);
      } catch (error) {
        errorLine.textContent = error.message; errorLine.hidden = false; submit.disabled = false;
      }
    });
    box.append(form);
    const back = node('button', 'text-button', 'Volver a iniciar sesión'); back.type = 'button'; back.dataset.action = 'back-to-login'; box.append(back);
    showModal(box);
  }
  function renderPasswordResetComplete(token) {
    let resetToken = typeof token === 'string' ? token : '';
    const box = node('div');
    box.append(node('p', 'eyebrow', 'RECUPERAR CUENTA'), node('h2', '', 'Crea una nueva contraseña'), node('p', 'modal-intro', 'El enlace es de un solo uso y vence en 30 minutos.'));
    const form = node('form', 'modal-form'); form.noValidate = true;
    form.append(modalFormLabel('Nueva contraseña', 'password', 'password', { minlength: 8, autocomplete: 'new-password', placeholder: 'Mínimo 8 caracteres' }));
    form.append(modalFormLabel('Confirmar contraseña', 'passwordConfirm', 'password', { minlength: 8, autocomplete: 'new-password', placeholder: 'Repite la contraseña' }));
    const submit = node('button', 'button button-dark button-wide', 'Guardar nueva contraseña'); submit.type = 'submit'; form.append(submit);
    const errorLine = node('p', 'form-error'); errorLine.hidden = true; errorLine.setAttribute('role', 'alert'); form.append(errorLine);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const password = form.elements.password.value;
      if (password !== form.elements.passwordConfirm.value) {
        errorLine.textContent = 'Las contraseñas no coinciden.'; errorLine.hidden = false; return;
      }
      submit.disabled = true; errorLine.hidden = true;
      try {
        await apiRequest('/auth/password-reset/complete', { method: 'POST', body: { token: resetToken, password } });
        resetToken = '';
        await syncBackend();
        renderAccount('login');
        showToast('Contraseña actualizada. Inicia sesión con la nueva contraseña.');
      } catch (error) {
        errorLine.textContent = error.message; errorLine.hidden = false; submit.disabled = false;
      }
    });
    box.append(form, node('p', 'modal-hint', 'La contraseña se guarda como hash; el enlace no se conserva en el navegador.'));
    showModal(box);
  }
  function openPasswordResetFromFragment() {
    const prefix = '#password-reset=';
    if (!window.location.hash.startsWith(prefix)) return false;
    const token = window.location.hash.slice(prefix.length);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    renderPasswordResetComplete(token);
    return true;
  }
  function renderProductDetail(id) {
    const product = productFor(id); if (!product) return;
    const content = $('#productDetailContent'); content.replaceChildren();
    selectedVariant = '';
    const breadcrumb = node('p', 'product-breadcrumb', `Inicio  /  ${product.category}  /  ${product.name}`); content.append(breadcrumb);
    const layout = node('div', 'detail-layout product-detail-layout');
    const gallery = node('div', 'product-gallery');
    const mainImage = node('img', 'product-primary-image'); mainImage.id = 'productPrimaryImage'; mainImage.src = safeImage(product.image); mainImage.alt = escapeText(product.name);
    const thumbnails = node('div', 'product-thumbnails');
    const galleryImages = [...new Set([...(product.gallery || []), safeImage(product.image)])].slice(0, 4);
    galleryImages.forEach((path, index) => {
      const thumb = node('button', `product-thumb${path === safeImage(product.image) ? ' active' : ''}`); thumb.type = 'button'; thumb.dataset.action = 'product-image'; thumb.dataset.image = path; thumb.setAttribute('aria-label', `Ver imagen ${index + 1} de ${product.name}`);
      const thumbImage = node('img'); thumbImage.src = safeImage(path); thumbImage.alt = ''; thumb.loading = 'lazy'; thumb.append(thumbImage); thumbnails.append(thumb);
    });
    gallery.append(mainImage, thumbnails);
    const detail = node('div', 'product-detail-copy');
    detail.append(node('p', 'eyebrow', product.category.toUpperCase()), node('h1', '', product.name), node('p', 'product-detail-description', product.description));
    const priceBlock = node('div', 'product-detail-price'); priceBlock.append(node('strong', '', fmt(product.price)), node('small', '', 'COP · precio ilustrativo')); detail.append(priceBlock);
    const variants = product.category.includes('Cascos') ? ['S / M', 'L / XL'] : product.category.includes('Ropa') ? ['S', 'M', 'L', 'XL'] : product.category.startsWith('Bicicletas') ? ['S', 'M', 'L', 'XL'] : [];
    if (variants.length) {
      selectedVariant = variants.includes('M') ? 'M' : variants[0];
      const optionGroup = node('div', 'variant-picker'); optionGroup.append(node('span', 'variant-label', product.category.includes('Cascos') ? 'Talla del casco' : product.category.includes('Ropa') ? 'Talla' : 'Talla del marco'));
      const choices = node('div', 'variant-options');
      variants.forEach((variant) => { const option = node('button', `variant-option${variant === selectedVariant ? ' active' : ''}`, variant); option.type = 'button'; option.dataset.productVariant = variant; option.setAttribute('aria-pressed', String(variant === selectedVariant)); choices.append(option); });
      optionGroup.append(choices); detail.append(optionGroup);
    }
    const stock = stockText(product); const stockLine = node('p', `product-detail-stock ${stock[1]}`.trim(), `${stock[0]} · ${product.stock} unidades de muestra`); detail.append(stockLine);
    detail.append(node('p', 'product-delivery-note', 'Entrega estimada ilustrativa: 3–5 días hábiles. No se preparan envíos reales.'));
    const actions = node('div', 'product-detail-actions');
    const add = node('button', 'button button-lime button-wide', 'Agregar al carrito →'); add.type = 'button'; add.dataset.action = 'add-cart'; add.dataset.productId = product.id; add.dataset.variant = selectedVariant; add.disabled = product.stock < 1;
    const buy = node('button', 'button button-dark button-wide', 'Ver carrito'); buy.type = 'button'; buy.dataset.action = 'buy-now'; buy.dataset.productId = product.id; buy.dataset.variant = selectedVariant; buy.disabled = product.stock < 1;
    actions.append(add, buy); detail.append(actions);
    detail.append(node('p', 'detail-demo-note', 'La selección se guarda en el servidor; los pagos y envíos no están habilitados.'));
    layout.append(gallery, detail); content.append(layout);
  }
  function renderRestoreConfirm() {
    const box = node('div'); box.append(node('p', 'eyebrow', 'REINICIAR DEMOSTRACIÓN'), node('h2', '', '¿Restaurar datos?'), node('p', 'modal-intro', 'Se reiniciarán el catálogo, el carrito, los pedidos y los usuarios ficticios guardados por esta demo en este navegador. No se borrará ningún otro dato.'));
    const actions = node('div', 'success-actions');
    const cancel = node('button', 'button button-outline', 'Cancelar'); cancel.type = 'button'; cancel.dataset.action = 'close-modal';
    const confirm = node('button', 'button button-dark', 'Restaurar demo'); confirm.type = 'button'; confirm.dataset.action = 'confirm-restore';
    actions.append(cancel, confirm); box.append(actions); showModal(box);
  }
  function restoreData() {
    Object.values(KEY).forEach((key) => { try { localStorage.removeItem(key); } catch (_) { /* storage may be unavailable */ } });
    products = clone(DEFAULT_PRODUCTS); cart = []; orders = clone(DEFAULT_ORDERS); users = clone(DEFAULT_USERS); favorites = [];
    save(KEY.products, products); save(KEY.orders, orders); save(KEY.users, users); save(KEY.cart, cart); save(KEY.favorites, favorites);
    closeModal(); renderProducts(); renderCart(); refreshAdmin(); showToast('Datos demo restaurados en este navegador.');
  }

  function showAdminTab(tab) {
    currentAdminTab = 'products';
    $$('.admin-tab').forEach((section) => { section.hidden = section.id !== 'adminProducts'; });
    $$('.sidebar-link[data-admin-tab]').forEach((button) => button.classList.toggle('active', button.dataset.adminTab === currentAdminTab));
    $('#adminBreadcrumb').textContent = 'Productos y stock';
    refreshAdmin();
  }
  function getFilteredOrders() {
    const from = $('#reportFrom')?.value || ''; const to = $('#reportTo')?.value || ''; const selected = $('#reportCategory')?.value || 'all';
    return orders.filter((order) => (!from || order.date >= from) && (!to || order.date <= to)).map((order) => ({
      ...order, items: selected === 'all' ? order.items : order.items.filter((item) => item.category === selected)
    })).filter((order) => order.items.length > 0);
  }
  function orderAmount(order) { return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0); }
  function ensureCategoryOptions(select, includeAll = true) {
    const selected = select.value || 'all'; select.replaceChildren();
    if (includeAll) { const option = node('option', '', 'Todas las categorías'); option.value = 'all'; select.append(option); }
    CATEGORIES.forEach((categoryName) => { const option = node('option', '', categoryName); option.value = categoryName; select.append(option); });
    select.value = [...select.options].some((o) => o.value === selected) ? selected : 'all';
  }
  function renderOverview() {
    const list = getFilteredOrders(); const sales = list.reduce((sum, order) => sum + orderAmount(order), 0); const units = list.reduce((sum, order) => sum + order.items.reduce((subtotal, item) => subtotal + item.quantity, 0), 0);
    $('#metricSales').textContent = fmt(sales); $('#metricOrders').textContent = String(list.length); $('#metricUnits').textContent = String(units);
    const totals = new Map();
    list.forEach((order) => order.items.forEach((item) => { const previous = totals.get(item.name) || { quantity: 0, sales: 0 }; previous.quantity += item.quantity; previous.sales += item.quantity * item.price; totals.set(item.name, previous); }));
    const best = [...totals.entries()].sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 4);
    const top = $('#topProducts'); top.replaceChildren();
    if (!best.length) top.append(node('div', 'admin-empty', 'Sin pedidos para estos filtros.'));
    best.forEach(([name, data], index) => { const row = node('div', 'top-product-row'); row.append(node('span', '', String(index + 1).padStart(2, '0')), node('strong', '', name), node('small', '', `${data.quantity} uds.`)); const bar = node('span', 'mini-bar'); const fill = node('i'); fill.style.width = `${Math.max(5, Math.round(data.quantity / best[0][1].quantity * 100))}%`; bar.append(fill); row.append(bar); top.append(row); });
    const recent = $('#recentActivity'); recent.replaceChildren();
    list.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).forEach((order) => { const row = node('div', 'activity-row'); row.append(node('span', 'activity-avatar', 'n.')); const middle = node('span'); middle.append(node('strong', '', order.id), node('small', '', `Pedido ilustrativo · ${dateFmt.format(new Date(`${order.date}T12:00:00`))}`)); row.append(middle, node('span', '', fmt(orderAmount(order)))); recent.append(row); });
    if (!list.length) recent.append(node('div', 'admin-empty', 'Sin movimientos para estos filtros.'));
  }
  function renderAdminProducts() {
    const tbody = $('#adminProductRows'); if (!tbody) return; tbody.replaceChildren();
    const query = ($('#productAdminSearch').value || '').trim().toLocaleLowerCase('es'); const filter = $('#productAdminCategory').value || 'all';
    const list = products.filter((p) => (!query || `${p.name} ${p.category}`.toLocaleLowerCase('es').includes(query)) && (filter === 'all' || p.category === filter));
    $('#adminProductCount').textContent = `${list.length} ${list.length === 1 ? 'producto' : 'productos'}`;
    list.forEach((product) => {
      const row = node('tr'); const productCell = node('td'); const productWrap = node('div', 'table-product'); const image = node('img'); image.src = safeImage(product.image); image.alt = '';
      const text = node('span'); text.append(node('strong', '', product.name), node('small', '', product.id)); productWrap.append(image, text); productCell.append(productWrap); row.append(productCell, node('td', '', product.category), node('td', '', fmt(product.price)), node('td', '', `${product.stock} unidades`));
      const status = node('td'); status.append(node('span', `state-pill${product.active ? '' : ' off'}`, product.active ? 'Activo' : 'Inactivo')); row.append(status);
      const actionCell = node('td'); const edit = node('button', 'table-action', 'Editar'); edit.type = 'button'; edit.dataset.action = 'edit-product'; edit.dataset.productId = product.id; actionCell.append(edit);
      if (product.active) { const remove = node('button', 'table-action', 'Desactivar'); remove.type = 'button'; remove.dataset.action = 'delete-product'; remove.dataset.productId = product.id; actionCell.append(remove); }
      row.append(actionCell); tbody.append(row);
    });
    if (!list.length) { const row = node('tr'); const cell = node('td', 'empty-row', 'No encontramos productos.'); cell.colSpan = 6; row.append(cell); tbody.append(row); }
  }
  function renderAdminOrders() {
    const tbody = $('#adminOrderRows'); tbody.replaceChildren();
    const list = getFilteredOrders().slice().sort((a, b) => b.date.localeCompare(a.date));
    list.forEach((order) => { const row = node('tr'); row.append(node('td', '', order.id), node('td', '', dateFmt.format(new Date(`${order.date}T12:00:00`))), node('td', '', order.items.map((item) => item.name).join(', ')), node('td', '', order.items.reduce((sum, item) => sum + item.quantity, 0)), node('td', '', fmt(orderAmount(order)))); const status = node('td'); status.append(node('span', 'state-pill', 'Pedido de prueba')); row.append(status); tbody.append(row); });
    if (!list.length) { const row = node('tr'); const cell = node('td', 'empty-row', 'No hay pedidos en este rango.'); cell.colSpan = 6; row.append(cell); tbody.append(row); }
  }
  function renderAdminUsers() {
    const tbody = $('#adminUserRows'); tbody.replaceChildren(); const query = ($('#userAdminSearch').value || '').trim().toLocaleLowerCase('es');
    const list = users.filter((user) => `${user.name} ${user.email}`.toLocaleLowerCase('es').includes(query));
    list.forEach((user) => {
      const row = node('tr'); const nameCell = node('td'); const avatar = node('span', 'activity-avatar', user.name.slice(0, 1)); const name = node('span'); name.append(node('strong', '', user.name), node('small', '', 'Perfil ficticio')); const wrap = node('div', 'table-product'); wrap.append(avatar, name); nameCell.append(wrap);
      row.append(nameCell, node('td', '', user.email));
      const roleCell = node('td'); const select = node('select', 'role-select'); select.dataset.userRole = user.id; [['Cliente', 'Cliente'], ['Administrador demo', 'Administrador demo']].forEach(([value, label]) => { const option = node('option', '', label); option.value = value; select.append(option); }); select.value = user.role; roleCell.append(select); row.append(roleCell);
      const stateCell = node('td'); const toggle = node('button', `state-pill${user.active ? '' : ' off'}`, user.active ? 'Activo demo' : 'Inactivo demo'); toggle.type = 'button'; toggle.dataset.action = 'toggle-user'; toggle.dataset.userId = user.id; stateCell.append(toggle); row.append(stateCell); tbody.append(row);
    });
    if (!list.length) { const row = node('tr'); const cell = node('td', 'empty-row', 'No hay perfiles con esa búsqueda.'); cell.colSpan = 4; row.append(cell); tbody.append(row); }
  }
  async function refreshAdmin() {
    if (!$('#adminView') || $('#adminView').hidden || currentUser?.role !== 'admin') return;
    const categorySelect = $('#productAdminCategory');
    if (categorySelect) ensureCategoryOptions(categorySelect);
    try {
      const result = await apiRequest('/admin/products');
      products = cleanProducts(result.products) || [];
      renderAdminProducts();
    } catch (error) { showToast(error.message); }
  }

  function renderProductForm(product = null) {
    const box = node('div'); box.append(node('p', 'eyebrow', 'CATÁLOGO BIKESTORE'), node('h2', '', product ? 'Editar producto' : 'Añadir producto'), node('p', 'modal-intro', 'Los cambios y las existencias se guardan en la base de datos.'));
    const form = node('form', 'modal-form'); form.noValidate = true;
    const name = modalFormLabel('Nombre', 'name', 'text', { minlength: 2, placeholder: 'Nombre del producto' });
    const categoryLabel = node('label', '', 'Categoría'); const categorySelect = node('select'); categorySelect.name = 'category'; categorySelect.required = true;
    CATEGORIES.forEach((cat) => { const option = node('option', '', cat); option.value = cat; categorySelect.append(option); }); categoryLabel.append(categorySelect);
    const price = modalFormLabel('Precio ilustrativo (COP)', 'price', 'number', { placeholder: '250000' }); price.querySelector('input').min = '1000'; price.querySelector('input').max = '10000000'; price.querySelector('input').step = '1000';
    const stock = modalFormLabel('Unidades disponibles', 'stock', 'number', { placeholder: '10' }); stock.querySelector('input').min = '0'; stock.querySelector('input').max = '10000'; stock.querySelector('input').step = '1';
    const description = modalFormLabel('Descripción', 'description', 'textarea'); description.querySelector('textarea').required = false; description.querySelector('textarea').maxLength = 260; description.querySelector('textarea').placeholder = 'Una breve descripción para el catálogo.';
    const imageLabel = node('label', '', 'Imagen de la biblioteca demo'); const imageSelect = node('select'); imageSelect.name = 'image'; IMAGE_OPTIONS.forEach((path, index) => { const option = node('option', '', `Imagen ${String(index + 1).padStart(2, '0')}`); option.value = path; imageSelect.append(option); }); imageLabel.append(imageSelect);
    const activeLabel = node('label', '', 'Estado del producto'); const activeSelect = node('select'); activeSelect.name = 'active'; [['true', 'Activo'], ['false', 'Inactivo']].forEach(([value, label]) => { const option = node('option', '', label); option.value = value; activeSelect.append(option); }); activeLabel.append(activeSelect);
    form.append(name, categoryLabel, price, stock, description, imageLabel, activeLabel);
    const submit = node('button', 'button button-dark button-wide', product ? 'Guardar cambios' : 'Crear producto'); submit.type = 'submit'; form.append(submit);
    if (product) {
      form.elements.name.value = product.name; form.elements.category.value = product.category; form.elements.price.value = String(product.price); form.elements.stock.value = String(product.stock); form.elements.description.value = product.description || ''; form.elements.image.value = safeImage(product.image); form.elements.active.value = String(product.active);
    }
    let lastPatchPayload = '';
    let lastPatchKey = '';
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (!form.reportValidity()) return;
      const f = form.elements; const parsedPrice = Number(f.price.value); const parsedStock = Number(f.stock.value);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 1000 || parsedPrice > 10000000 || !Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 10000) { showToast('Revisa precio y existencias.'); return; }
      const updated = { id: product?.id || `custom-${globalThis.crypto?.randomUUID?.().slice(0, 10) || Math.random().toString(36).slice(2, 12)}`, name: f.name.value.trim().slice(0, 80), category: f.category.value, price: Math.round(parsedPrice), stock: parsedStock, description: f.description.value.trim().slice(0, 260), image: safeImage(f.image.value), active: f.active.value === 'true' };
      if (updated.name.length < 2) { showToast('El nombre debe tener al menos 2 caracteres.'); return; }
      submit.disabled = true;
      try {
        const patchPayload = JSON.stringify(updated);
        if (product && patchPayload !== lastPatchPayload) {
          lastPatchPayload = patchPayload;
          lastPatchKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        }
        await apiRequest(product ? `/admin/products/${encodeURIComponent(product.id)}` : '/admin/products', {
          method: product ? 'PATCH' : 'POST', body: updated,
          headers: product ? { 'Idempotency-Key': lastPatchKey } : undefined
        });
        closeModal(); await syncBackend(); await refreshAdmin(); showToast(product ? 'Producto actualizado.' : 'Producto añadido.');
      } catch (error) { showToast(error.message); }
      finally { submit.disabled = false; }
    });
    showModal(box); box.append(form);
  }

  function reportRows() {
    const filtered = getFilteredOrders();
    const rows = [['DEMO - sin validez comercial'], ['Fecha', 'Pedido demo', 'Producto', 'Categoría', 'Unidades', 'Precio unitario COP', 'Subtotal COP']];
    filtered.forEach((order) => order.items.forEach((item) => rows.push([order.date, order.id, item.name, item.category, item.quantity, item.price, item.quantity * item.price])));
    return rows;
  }
  function downloadCsv() {
    const content = '\ufeff' + reportRows().map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
    const link = node('a'); link.href = url; link.download = `bikestore-informe-demo-${today.toISOString().slice(0, 10)}.csv`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    showToast('Informe Excel CSV demo descargado.');
  }

  document.addEventListener('click', (event) => {
    const routeTrigger = event.target.closest('[data-route]');
    if (routeTrigger) {
      event.preventDefault();
      const target = new URL(routeTrigger.getAttribute('href') || routeTrigger.dataset.route || '/', window.location.origin);
      const menu = $('.main-nav'); menu?.classList.remove('menu-open'); $('[data-action="menu"]')?.setAttribute('aria-expanded', 'false');
      navigateTo(target.pathname, new URLSearchParams(target.search));
      return;
    }
    const viewTrigger = event.target.closest('[data-view]');
    if (viewTrigger) { event.preventDefault(); const view = viewTrigger.dataset.view; if (view === 'admin') currentAdminTab = 'products'; setView(view); if (viewTrigger.dataset.scroll) document.getElementById(viewTrigger.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); return; }
    const tabTrigger = event.target.closest('[data-admin-tab]');
    if (tabTrigger) { showAdminTab(tabTrigger.dataset.adminTab); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const categoryTrigger = event.target.closest('[data-category]');
    if (categoryTrigger) { updateRouteFilters({ category: categoryTrigger.dataset.category }, categoryTrigger.dataset.filterScope); return; }
    const accountTab = event.target.closest('[data-account-tab]');
    if (accountTab) { renderAccount(accountTab.dataset.accountTab); return; }
    const variantTrigger = event.target.closest('[data-product-variant]');
    if (variantTrigger) {
      selectedVariant = variantTrigger.dataset.productVariant;
      $$('.variant-option').forEach((option) => { const active = option === variantTrigger; option.classList.toggle('active', active); option.setAttribute('aria-pressed', String(active)); });
      $$('[data-action="add-cart"], [data-action="buy-now"]', $('#productDetailContent')).forEach((button) => { button.dataset.variant = selectedVariant; });
      return;
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const id = action.dataset.productId;
    switch (action.dataset.action) {
      case 'menu': { const nav = $('.main-nav'); const open = nav.classList.toggle('menu-open'); action.setAttribute('aria-expanded', String(open)); break; }
      case 'open-cart': openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'add-cart': addToCart(id, 1, action.dataset.variant || ''); break;
      case 'buy-now': addToCart(id, 1, action.dataset.variant || '').then((added) => { if (added) setView('cart'); }); break;
      case 'product-detail': navigateTo(`/producto/${encodeURIComponent(id)}`, { return: currentBrowseUrl() }); break;
      case 'product-image': { const image = $('#productPrimaryImage'); if (image) image.src = safeImage(action.dataset.image); $$('.product-thumb').forEach((thumb) => thumb.classList.toggle('active', thumb === action)); break; }
      case 'favorite': favorites = favorites.includes(id) ? favorites.filter((v) => v !== id) : [...favorites, id]; save(KEY.favorites, favorites); renderProducts(); showToast(favorites.includes(id) ? 'Guardado en favoritos de este navegador.' : 'Quitado de favoritos.'); break;
      case 'quantity': changeQuantity(id, Number(action.dataset.delta), action.dataset.variant || ''); break;
      case 'remove-cart': removeFromCart(id, action.dataset.variant || ''); break;
      case 'view-cart': setView('cart'); break;
      case 'checkout': if (!getLines().length) { showToast('Agrega un producto antes de continuar.'); break; } closeCart(); setView('checkout'); break;
      case 'back-to-cart': setView('cart'); break;
      case 'back-to-catalog': navigateTo(...(() => { const url = new URL(currentBrowseUrl(), window.location.origin); return [url.pathname, new URLSearchParams(url.search)]; })()); break;
      case 'continue-shopping': navigateTo(...(() => { const url = new URL(currentBrowseUrl(), window.location.origin); return [url.pathname, new URLSearchParams(url.search)]; })()); break;
      case 'close-modal': closeModal(); break;
      case 'clear-filters': updateRouteFilters({ category: 'Todos', q: '', sort: 'featured', availability: 'all' }, action.dataset.filterScope); break;
      case 'account': currentUser ? showToast(`Sesión iniciada: ${currentUser.email}`) : renderAccount('login'); break;
      case 'register': renderAccount('register'); break;
      case 'forgot-password': renderPasswordResetRequest(); break;
      case 'back-to-login': renderAccount('login'); break;
      case 'logout': apiRequest('/auth/logout', { method: 'POST' }).then(() => syncBackend()).then(() => showToast('Sesión cerrada.')).catch((error) => showToast(error.message)); break;
      case 'restore-data': renderRestoreConfirm(); break;
      case 'confirm-restore': restoreData(); break;
      case 'new-product': renderProductForm(); break;
      case 'edit-product': renderProductForm(productFor(id)); break;
      case 'delete-product': {
        if (!window.confirm('¿Dar de baja este producto? Se ocultará del catálogo y se quitará de los carritos.')) break;
        apiRequest(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
          .then(() => syncBackend()).then(() => refreshAdmin()).then(() => showToast('Producto dado de baja.'))
          .catch((error) => showToast(error.message));
        break;
      }
      case 'toggle-user': { const user = users.find((u) => u.id === action.dataset.userId); if (user) { user.active = !user.active; save(KEY.users, users); renderAdminUsers(); showToast('Estado demo actualizado.'); } break; }
      case 'export-csv': downloadCsv(); break;
      case 'print-report': window.print(); break;
      default: break;
    }
  });

  $('#searchInput').addEventListener('input', handleSearchInput);
  $('#catalogSearchInput')?.addEventListener('input', handleSearchInput);
  $('#accessorySearchInput')?.addEventListener('input', handleSearchInput);
  $('#sortSelect').addEventListener('change', (event) => updateRouteFilters({ sort: event.currentTarget.value }, 'catalog'));
  $('#accessorySortSelect')?.addEventListener('change', (event) => updateRouteFilters({ sort: event.currentTarget.value }, 'accessories'));
  $('#catalogAvailability')?.addEventListener('change', (event) => updateRouteFilters({ availability: event.currentTarget.value }, 'catalog'));
  $('#accessoryAvailability')?.addEventListener('change', (event) => updateRouteFilters({ availability: event.currentTarget.value }, 'accessories'));
  $('#checkoutForm').addEventListener('submit', submitDemoOrder);
  $('#productAdminSearch').addEventListener('input', renderAdminProducts);
  $('#productAdminCategory').addEventListener('change', renderAdminProducts);
  $('#overlay').addEventListener('click', closeCart);
  $('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeCart(); closeModal(); } });

  $('#todayLabel').textContent = dateFmt.format(today);
  updateAccountHeader();
  renderProducts(); renderCart();
  window.addEventListener('popstate', () => renderRoute());
  openPasswordResetFromFragment();
  syncBackend();
})();
