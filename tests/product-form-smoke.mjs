import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(projectRoot, 'public');
const chromiumPath = process.env.BIKESTORE_CHROMIUM_PATH || '/usr/bin/chromium';
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};
const validUploadPng = await readFile(path.join(projectRoot, 'tests/fixtures/valid-product-rgb.png'));
const largeSourceJpegBytes = await readFile(path.join(projectRoot, 'tests/fixtures/source-photo-large.jpg'));
const sourceWebpBytes = await readFile(path.join(projectRoot, 'tests/fixtures/source-photo-large.webp'));
const makePngDimensionHeader = (width, height) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunk = Buffer.alloc(25);
  chunk.writeUInt32BE(13, 0); chunk.write('IHDR', 4, 'ascii'); chunk.writeUInt32BE(width, 8); chunk.writeUInt32BE(height, 12);
  chunk[16] = 8; chunk[17] = 2;
  let crc = 0xffffffff;
  for (let index = 4; index < 21; index += 1) {
    crc ^= chunk[index];
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? crc >>> 1 ^ 0xedb88320 : crc >>> 1;
  }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 21);
  return Buffer.concat([signature, chunk]);
};
const makeJpegDimensionHeader = (width, height) => Buffer.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08,
  (height >>> 8) & 255, height & 255, (width >>> 8) & 255, width & 255,
  1, 1, 0x11, 0
]);
const makeWebpExtendedDimensionHeader = (width, height) => {
  const out = Buffer.alloc(30);
  out.write('RIFF', 0, 'ascii'); out.writeUInt32LE(22, 4); out.write('WEBP', 8, 'ascii');
  out.write('VP8X', 12, 'ascii'); out.writeUInt32LE(10, 16);
  out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0;
  const widthMinusOne = width - 1, heightMinusOne = height - 1;
  out[24] = widthMinusOne & 255; out[25] = widthMinusOne >>> 8 & 255; out[26] = widthMinusOne >>> 16 & 255;
  out[27] = heightMinusOne & 255; out[28] = heightMinusOne >>> 8 & 255; out[29] = heightMinusOne >>> 16 & 255;
  return out;
};
const oversizedJpegPixels = makeJpegDimensionHeader(10000, 5001);
const oversizedJpegSide = makeJpegDimensionHeader(16001, 1);
const oversizedPngSide = makePngDimensionHeader(16001, 1);
const oversizedWebpSide = makeWebpExtendedDimensionHeader(16001, 1);

await access(chromiumPath);
const sourceHtml = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
const appScriptTag = '<script defer="" src="app.js"></script>';
assert.ok(sourceHtml.includes(appScriptTag), 'the fixture must load the real app.js');
const workerSource = await readFile(path.join(projectRoot, 'src', 'worker.js'), 'utf8');
const imageRulesStart = workerSource.indexOf('var IMAGE_PATHS = new Set([');
const imageRulesEnd = workerSource.indexOf('\nfunction json', imageRulesStart);
const productValidatorStart = workerSource.indexOf('function cleanProductInput(value) {');
const productValidatorEnd = workerSource.indexOf('\nvar ApiInputError', productValidatorStart);
const imageLimitsStart = workerSource.indexOf('var MAX_PRODUCT_IMAGE_BYTES =');
const imageLimitsEnd = workerSource.indexOf('\nvar AUTH_WINDOW_SECONDS', imageLimitsStart);
const imageParserStart = workerSource.indexOf('function detectProductImageFormat(bytes) {');
const imageParserEnd = workerSource.indexOf('\nfunction productImageUploadsReady', imageParserStart);
assert.ok(imageRulesStart >= 0 && imageRulesEnd > imageRulesStart, 'extract Worker image/category rules');
assert.ok(productValidatorStart >= 0 && productValidatorEnd > productValidatorStart, 'extract the actual Worker product validator');
assert.ok(imageLimitsStart >= 0 && imageLimitsEnd > imageLimitsStart && imageParserStart >= 0 && imageParserEnd > imageParserStart, 'extract the real Worker image decoder and limits');
const workerValidationCode = [
  'const __name = (fn) => fn;',
  workerSource.slice(imageRulesStart, imageRulesEnd),
  workerSource.slice(productValidatorStart, productValidatorEnd),
  workerSource.slice(imageLimitsStart, imageLimitsEnd),
  workerSource.slice(imageParserStart, imageParserEnd)
].join('\n');

const fixtureBootstrap = String.raw`(() => {
  /*__WORKER_VALIDATOR__*/
  const product = {
    id: 'bike-scorpion-mtb',
    name: 'Scorpion MTB 29',
    category: 'Bicicletas de montaña',
    price: 899000,
    stock: 6,
    image: '/assets/bikestore/bike-mountain.jpg',
    description: 'Bicicleta todo terreno para descubrir nuevos senderos con control y confianza.',
    active: true,
    featured: false,
    flag: 'Fixture',
    gear: true
  };
  const originalFixture = { ...product };
  const products = [product];
  const user = {
    id: 'fixture-admin',
    name: 'Administradora de prueba',
    email: 'admin-fixture@example.test',
    role: 'admin',
    accountType: 'account'
  };
  const result = { patches: [], uploads: [], creates: [], events: [], fetchTrace: [], imageDeleteRequests: 0 };
  const fixtureUploadEnabled = /*__UPLOAD_ENABLED__*/;
  window.__productFormSmoke = result;
  const reply = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
  const uploadedImageBytes = Uint8Array.from(atob('/*__UPLOAD_IMAGE_BASE64__*/'), (character) => character.charCodeAt(0));
  const largeSourceJpegBytes = Uint8Array.from(atob('/*__SOURCE_JPEG_BASE64__*/'), (character) => character.charCodeAt(0));
  const sourceWebpBytes = Uint8Array.from(atob('/*__SOURCE_WEBP_BASE64__*/'), (character) => character.charCodeAt(0));
  const oversizedJpegPixelsBytes = Uint8Array.from(atob('/*__OVERSIZED_JPEG_PIXELS__*/'), (character) => character.charCodeAt(0));
  const oversizedJpegSideBytes = Uint8Array.from(atob('/*__OVERSIZED_JPEG_SIDE__*/'), (character) => character.charCodeAt(0));
  const oversizedPngSideBytes = Uint8Array.from(atob('/*__OVERSIZED_PNG_SIDE__*/'), (character) => character.charCodeAt(0));
  const oversizedWebpSideBytes = Uint8Array.from(atob('/*__OVERSIZED_WEBP_SIDE__*/'), (character) => character.charCodeAt(0));
  const imageDimensions = (bytes) => {
    if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) return { width: 0, height: 0 };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  };
  const imageChunkStats = (bytes) => {
    const names = [];
    let count = 0;
    let idatCount = 0;
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const length = view.getUint32(offset);
      if (offset + length + 12 > bytes.length) break;
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      count += 1;
      if (type === 'IDAT') idatCount += 1;
      if (names.length < 24) names.push(type + ':' + length);
      offset += length + 12;
    }
    return { count, idatCount, firstChunks: names };
  };
  window.fetch = async (input, options = {}) => {
    const pathname = new URL(typeof input === 'string' ? input : input.url, location.origin).pathname;
    const method = (options.method || 'GET').toUpperCase();
    result.fetchTrace.push(method + ' ' + pathname);
    if (pathname.startsWith('/api/images/') && method === 'GET') return new Response(uploadedImageBytes, { status: 200, headers: { 'Content-Type': 'image/png' } });
    if (pathname === '/api/admin/images/status' && method === 'GET') return reply({ enabled: fixtureUploadEnabled, maxBytes: 4 * 1024 * 1024, message: fixtureUploadEnabled ? 'Fixture: R2 y validación activos.' : 'Carga desactivada: requiere R2 y verificación del tiempo de CPU en el Worker objetivo.' });
    if (pathname.startsWith('/api/admin/images') && method === 'DELETE') { result.imageDeleteRequests += 1; return reply({ error: 'Fixture no permite borrar imágenes.' }, 405); }
    if (pathname === '/api/admin/images' && method === 'POST') {
      const body = options.body;
      const headers = new Headers(options.headers || {});
      const file = body instanceof FormData ? body.get('image') : null;
      result.uploadState = 'reading-file';
      const fileBytes = file ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
      result.uploadState = 'validating-' + fileBytes.length + '-bytes';
      const workerFormat = file ? await validateProductImageBytes(fileBytes, file.type || '') : null;
      result.uploadState = 'validated-' + Boolean(workerFormat);
      const dimensions = imageDimensions(fileBytes);
      result.uploads.push({ isFormData: body instanceof FormData, fileName: file?.name || '', fileType: file?.type || '', fileSize: file?.size || 0, contentTypeHeader: headers.get('Content-Type'), workerValidatorAccepted: Boolean(workerFormat), width: dimensions.width, height: dimensions.height, chunks: imageChunkStats(fileBytes) });
      result.events.push('upload');
      const imagePaths = ['/api/images/12345678-1234-4234-9234-123456789abc.png', '/api/images/12345678-1234-4234-9234-123456789abd.png', '/api/images/12345678-1234-4234-9234-123456789abe.png'];
      const image = imagePaths[result.uploads.length - 1];
      result.uploads[result.uploads.length - 1].image = image;
      return reply({ image }, 201);
    }
    if (pathname === '/api/products' && method === 'GET') return reply({ products: products.filter((entry) => entry.active).map((entry) => ({ ...entry })) });
    if (pathname === '/api/auth/session' && method === 'GET') return reply({ user: { ...user } });
    if (pathname === '/api/admin/products' && method === 'GET') return reply({ products: products.map((entry) => ({ ...entry })) });
    if (pathname === '/api/admin/products' && method === 'POST') {
      const payload = JSON.parse(options.body || '{}');
      result.creates.push(payload); result.events.push('create');
      const validated = cleanProductInput(payload);
      result.createValidatorAccepted = Boolean(validated);
      if (!validated) return reply({ error: 'Revisa los datos del producto.' }, 400);
      const created = { ...validated }; products.push(created);
      return reply({ product: created }, 201);
    }
    if (pathname === '/api/admin/products/' + product.id && method === 'PATCH') {
      const payload = JSON.parse(options.body || '{}');
      result.patches.push(payload); result.events.push('patch-attempt');
      const validated = cleanProductInput(payload);
      result.serverValidatorAccepted = Boolean(validated) && validated.id === product.id;
      const legacyImage = String(payload.image || '').replace(/^\/+/, '');
      const legacyValidated = cleanProductInput({ ...payload, image: legacyImage });
      result.legacyImageAccepted = Boolean(legacyValidated) && legacyValidated.image === '/' + legacyImage;
      const uploadedImage = '/api/images/12345678-1234-4234-9234-123456789abc.png';
      const uploadedValidated = cleanProductInput({ ...payload, image: uploadedImage });
      result.uploadedImageAccepted = Boolean(uploadedValidated) && uploadedValidated.image === uploadedImage;
      result.unlistedImageRejected = cleanProductInput({ ...payload, image: 'assets/bikestore/not-listed.jpg' }) === null;
      if (!result.serverValidatorAccepted) {
        result.apiError = 'Revisa los datos del producto.';
        return reply({ error: result.apiError }, 400);
      }
      if (result.patches.length === 1) { result.events.push('patch-failed'); return reply({ error: 'Fallo de guardado simulado.' }, 503); }
      result.events.push('patch-saved');
      Object.assign(product, validated);
      return reply({ product: { ...product } });
    }
    if (pathname === '/api/cart' && method === 'GET') return reply({ items: [], user: { ...user } });
    return reply({ error: 'Unexpected fixture request: ' + method + ' ' + pathname }, 404);
  };
  const waitFor = async (predicate, label, timeoutMs = 5000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Timed out waiting for ' + label);
  };
  const showResult = (status, detail) => {
    const element = document.getElementById('product-form-regression-result') || document.body.appendChild(document.createElement('pre'));
    element.id = 'product-form-regression-result';
    element.dataset.status = status;
    element.textContent = detail;
  };
  window.addEventListener('load', async () => {
    let originalPrice = null;
    let testData = null;
    let testError = null;
    try {
      showResult('RUNNING', 'Waiting for admin fixture');
      const measureSourceImage = async (bytes, mimeType) => {
        const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        try {
          return await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = () => reject(new Error('The local photo fixture did not decode: mime=' + mimeType + ' bytes=' + bytes.length + ' signature=' + Array.from(bytes.slice(0, 12)).join(',')));
            image.src = url;
          });
        } finally { URL.revokeObjectURL(url); }
      };
      const attachOwnPhoto = async (targetForm, filename = 'bike-custom.jpg', mimeType = 'image/jpeg', bytes = largeSourceJpegBytes, probeSource = true) => {
        const transfer = new DataTransfer();
        const file = new File([bytes], filename, { type: mimeType });
        transfer.items.add(file);
        const input = targetForm.elements.namedItem('imageFile');
        input.files = transfer.files;
        if (probeSource) {
          const fileProbe = await measureSourceImage(input.files[0], mimeType);
          result.attachedSource = { name: input.files[0].name, size: input.files[0].size, width: fileProbe.width, height: fileProbe.height };
        }
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input;
      };
      await waitFor(() => document.querySelector('#adminNavLink') && !document.querySelector('#adminNavLink').hidden, 'admin navigation');
      if (window.innerWidth <= 640) {
        document.querySelector('[data-action="menu"]').click();
        await waitFor(() => getComputedStyle(document.querySelector('.main-nav')).display === 'flex', 'mobile admin menu open');
      }
      document.querySelector('#adminNavLink').click();
      await waitFor(() => !document.querySelector('#adminView').hidden && document.querySelector('#adminProductRows [data-action="edit-product"]'), 'admin product row');
      document.querySelector('#adminProductRows [data-action="edit-product"]').click();
      await waitFor(() => document.querySelector('#modalContent form.modal-form'), 'real product edit form');
      const form = document.querySelector('#modalContent form.modal-form');
      const previewAlign = getComputedStyle(form.querySelector('.admin-image-preview')).alignItems;
      const expectedPreviewAlign = window.innerWidth <= 640 ? 'flex-start' : 'center';
      if (previewAlign !== expectedPreviewAlign) throw new Error('Image picker responsive alignment mismatch at width ' + window.innerWidth + ': ' + previewAlign);
      if (!fixtureUploadEnabled) {
        const fileInput = form.elements.namedItem('imageFile');
        const librarySelect = form.elements.namedItem('image');
        await waitFor(() => document.querySelector('#productImageHint')?.textContent.includes('Carga desactivada'), 'disabled R2 hint');
        if (!fileInput.disabled || !fileInput.getAttribute('accept')?.includes('image/jpeg') || !fileInput.getAttribute('accept')?.includes('image/webp') || librarySelect.disabled || librarySelect.options.length < 18 || !form.querySelector('.admin-image-upload')?.textContent.includes('desactivada')) throw new Error('Without R2, own-photo upload must stay disabled while the bundled library remains available');
        testData = { viewportWidth: window.innerWidth, previewAlign, uploadDisabled: fileInput.disabled, libraryAvailable: !librarySelect.disabled, reason: document.querySelector('#productImageHint').textContent };
      } else {
      const price = form.elements.namedItem('price');
      const image = form.elements.namedItem('image');
      originalPrice = Number(price.value);
      const editedPrice = originalPrice + 1;
      image.selectedIndex = 3;
      image.dispatchEvent(new Event('change', { bubbles: true }));
      const selectedImage = image.value;
      if (image.options[image.selectedIndex].textContent !== 'Imagen 04') throw new Error('Expected the screenshot fixture to select Imagen 04');
      const fileInput = form.elements.namedItem('imageFile');
      if (!fileInput.getAttribute('accept')?.includes('image/jpeg') || !fileInput.getAttribute('accept')?.includes('image/webp')) throw new Error('The file chooser must offer JPEG, PNG and WebP sources');
      const invalidTransfer = new DataTransfer(); invalidTransfer.items.add(new File([new TextEncoder().encode('<svg><script>not a photo</script></svg>')], 'not-a-photo.svg', { type: 'image/svg+xml' }));
      fileInput.files = invalidTransfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await waitFor(() => document.querySelector('#toast')?.textContent.includes('PNG, JPG o WebP'), 'client rejection of unsupported SVG');
      if (fileInput.value !== '') throw new Error('Unsupported SVG selection should be cleared');
      await waitFor(() => !fileInput.disabled, 'R2 status check in enabled test fixture');
      const nativeImageConstructor = window.Image;
      const nativeCreateImageBitmap = window.createImageBitmap;
      let sourceDecoderInvocations = 0;
      window.Image = function (...args) { sourceDecoderInvocations += 1; return Reflect.construct(nativeImageConstructor, args); };
      if (typeof nativeCreateImageBitmap === 'function') window.createImageBitmap = function (...args) { sourceDecoderInvocations += 1; return nativeCreateImageBitmap.apply(window, args); };
      const assertRejectedBeforeDecode = async (bytes, filename, mimeType, reason) => {
        const before = sourceDecoderInvocations;
        await attachOwnPhoto(form, filename, mimeType, bytes, false);
        await waitFor(() => !fileInput.disabled && fileInput.value === '', filename + ' rejected from its header');
        if (sourceDecoderInvocations !== before) throw new Error(filename + ' invoked an image decoder before dimension limits were enforced');
        if (!document.querySelector('#toast')?.textContent.includes(reason)) throw new Error(filename + ' did not report the expected dimension limit: ' + document.querySelector('#toast')?.textContent);
      };
      try {
        await assertRejectedBeforeDecode(oversizedJpegPixelsBytes, 'over-50mp.jpg', 'image/jpeg', '50 MP');
        await assertRejectedBeforeDecode(oversizedJpegSideBytes, 'over-16000px.jpg', 'image/jpeg', '16.000 px');
        await assertRejectedBeforeDecode(oversizedPngSideBytes, 'over-16000px.png', 'image/png', '16.000 px');
        await assertRejectedBeforeDecode(oversizedWebpSideBytes, 'over-16000px.webp', 'image/webp', '16.000 px');
      } finally {
        window.Image = nativeImageConstructor;
        if (typeof nativeCreateImageBitmap === 'function') window.createImageBitmap = nativeCreateImageBitmap;
      }
      result.overLimitDecoderInvocationCount = sourceDecoderInvocations;
      result.oversizedImagesRejectedBeforeDecode = true;
      const jpegSourceDimensions = await measureSourceImage(largeSourceJpegBytes, 'image/jpeg');
      if (jpegSourceDimensions.width * jpegSourceDimensions.height <= 1500000) throw new Error('The JPEG acceptance fixture must exceed the Worker pixel limit');
      const truncatedTransfer = new DataTransfer(); truncatedTransfer.items.add(new File([uploadedImageBytes.slice(0, 12)], 'truncated.png', { type: 'image/png' }));
      fileInput.files = truncatedTransfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await waitFor(() => !fileInput.disabled && fileInput.value === '', 'browser decoder rejecting truncated PNG');
      await attachOwnPhoto(form, 'bike-custom.jpg', 'image/jpeg', largeSourceJpegBytes);
      await waitFor(() => form.querySelector('.admin-image-preview img')?.src.startsWith('blob:'), 'local image preview').catch((error) => {
        throw new Error(error.message + '; fileDisabled=' + fileInput.disabled + '; fileValue=' + fileInput.value + '; caption=' + form.querySelector('.admin-image-preview-caption')?.textContent + '; toast=' + document.querySelector('#toast')?.textContent);
      });
      const headerOnlyMode = /*__HEADER_ONLY__*/;
      if (headerOnlyMode) {
        if (!form.querySelector('.admin-image-preview-caption')?.textContent.includes('bike-custom.png')) throw new Error('A regular JPEG must pass its header check and convert before decoding limits are applied');
        await attachOwnPhoto(form, 'header-webp-source.webp', 'image/webp', sourceWebpBytes);
        await waitFor(() => !fileInput.disabled && form.querySelector('.admin-image-preview-caption')?.textContent.includes('header-webp-source.png'), 'regular WebP header check and normalization', 15000).catch((error) => { throw new Error(error.message + '; disabled=' + fileInput.disabled + '; caption=' + form.querySelector('.admin-image-preview-caption')?.textContent + '; toast=' + document.querySelector('#toast')?.textContent); });
        await attachOwnPhoto(form, 'header-png-source.png', 'image/png', uploadedImageBytes);
        await waitFor(() => !fileInput.disabled && form.querySelector('.admin-image-preview-caption')?.textContent.includes('header-png-source.png'), 'regular PNG header check and normalization', 15000).catch((error) => { throw new Error(error.message + '; disabled=' + fileInput.disabled + '; caption=' + form.querySelector('.admin-image-preview-caption')?.textContent + '; toast=' + document.querySelector('#toast')?.textContent); });
        testData = { viewportWidth: window.innerWidth, previewAlign, jpegConvertedToPng: true, webpConvertedToPng: true, pngSourceConvertedToPng: true, oversizedImagesRejectedBeforeDecode: result.oversizedImagesRejectedBeforeDecode, decoderCallsForOverLimitFiles: result.overLimitDecoderInvocationCount, uploadRequests: result.fetchTrace.filter((entry) => entry === 'POST /api/admin/images').length };
      } else {
      const configuredStep = price.getAttribute('step');
      if (configuredStep !== '1') throw new Error('Expected native price step=1; found ' + configuredStep);
      price.value = String(editedPrice);
      price.dispatchEvent(new Event('input', { bubbles: true }));
      price.dispatchEvent(new Event('change', { bubbles: true }));
      const nativelyValid = form.reportValidity();
      form.requestSubmit();
      if (!nativelyValid || !price.validity.valid || price.validity.stepMismatch) {
        throw new Error('Native form validation rejected +1 COP (stepMismatch=' + price.validity.stepMismatch + ')');
      }
      await waitFor(() => result.patches.length === 1, 'first PATCH from the submitted form', 15000).catch((error) => { throw new Error(error.message + '; events=' + result.events.join(',') + '; uploadState=' + result.uploadState + '; fetchTrace=' + result.fetchTrace.join('|') + '; uploads=' + JSON.stringify(result.uploads) + '; preview=' + form.querySelector('.admin-image-preview-caption')?.textContent + '; toast=' + document.querySelector('#toast')?.textContent + '; fileDisabled=' + fileInput.disabled + '; submitDisabled=' + form.querySelector('button[type="submit"]')?.disabled); });
      await waitFor(() => document.querySelector('#toast')?.textContent.includes('La imagen subida se conserva en el formulario'), 'retained image notice after failed save');
      if (product.image !== originalFixture.image || image.value !== result.uploads[0]?.image) throw new Error('A failed save must leave the old product image intact and keep the uploaded path selected for retry');
      form.requestSubmit();
      await waitFor(() => result.patches.length === 2, 'retried PATCH with retained uploaded path', 2000);
      const patch = result.patches[1];
      if (result.apiError) throw new Error('Worker cleanProductInput returned the screenshot toast: ' + result.apiError + '; image=' + patch.image);
      if (!result.serverValidatorAccepted) throw new Error('Worker cleanProductInput did not accept the form payload');
      if (!result.legacyImageAccepted) throw new Error('Worker must normalize a legacy relative image path from a cached client');
      if (!result.uploadedImageAccepted) throw new Error('Worker must accept a safe R2-backed image path for a product');
      if (!result.unlistedImageRejected) throw new Error('Worker must continue rejecting images outside its allowlist');
      const editUpload = result.uploads[0];
      if (!editUpload?.isFormData || editUpload.fileName !== 'bike-custom.png' || editUpload.fileType !== 'image/png' || editUpload.fileSize < 1 || editUpload.fileSize > 4 * 1024 * 1024 || editUpload.contentTypeHeader !== null || !editUpload.workerValidatorAccepted || editUpload.chunks.idatCount <= 16 || editUpload.chunks.idatCount > 1024 || editUpload.chunks.count > 1026 || editUpload.width * editUpload.height > 1500000 || editUpload.width > 1600 || editUpload.height > 1600) {
        throw new Error('The large JPEG must be resized and converted to a canonical PNG accepted independently by the real Worker validator before multipart upload: ' + JSON.stringify(editUpload));
      }
      if (result.events.slice(0, 3).join(',') !== 'upload,patch-attempt,patch-failed' || result.events[3] !== 'patch-attempt' || result.events[4] !== 'patch-saved') throw new Error('The failed save/retry order did not retain the already-uploaded object: ' + result.events.join(','));
      if (result.uploads.length !== 1) throw new Error('Retrying a failed product save must reuse the retained R2 path rather than upload a duplicate');
      if (patch.price !== editedPrice || patch.id !== product.id || patch.image !== editUpload.image || !patch.image.startsWith('/api/images/')) {
        throw new Error('Submitted payload did not contain the edited product price: ' + JSON.stringify(patch));
      }
      await waitFor(() => document.querySelector('#modalBackdrop').hidden, 'edit modal close');
      document.querySelector('[data-action="new-product"]').click();
      await waitFor(() => !document.querySelector('#modalBackdrop').hidden && document.querySelector('#modalContent form.modal-form'), 'real product create form');
      const createForm = document.querySelector('#modalContent form.modal-form');
      await waitFor(() => !createForm.elements.namedItem('imageFile').disabled, 'R2 status check for create form');
      createForm.elements.namedItem('name').value = 'Producto con foto propia';
      createForm.elements.namedItem('category').value = 'Bicicletas de montaña';
      createForm.elements.namedItem('price').value = '125001';
      createForm.elements.namedItem('stock').value = '3';
      createForm.elements.namedItem('description').value = 'Producto creado en fixture aislado.';
      await attachOwnPhoto(createForm, 'bike-create.webp', 'image/webp', sourceWebpBytes);
      await waitFor(() => createForm.querySelector('.admin-image-preview img')?.src.startsWith('blob:'), 'create image preview');
      await waitFor(() => !createForm.elements.namedItem('imageFile').disabled, 'WebP normalization to finish before create submit', 15000);
      const createValid = createForm.reportValidity();
      createForm.requestSubmit();
      if (!createValid) throw new Error('New product form did not pass native validity before its image upload');
      await waitFor(() => result.creates.length > 0, 'POST for product with uploaded photo', 15000).catch((error) => { throw new Error(error.message + '; uploadState=' + result.uploadState + '; fetchTrace=' + result.fetchTrace.join('|') + '; events=' + result.events.join(',') + '; uploads=' + JSON.stringify(result.uploads)); });
      const createPayload = result.creates[0];
      if (!result.createValidatorAccepted || !createPayload.image.startsWith('/api/images/')) throw new Error('Worker product validator rejected the new uploaded-image path');
      if (result.uploads.length !== 2 || result.uploads[1].fileName !== 'bike-create.png' || result.uploads[1].fileType !== 'image/png' || result.uploads[1].contentTypeHeader !== null || !result.uploads[1].workerValidatorAccepted || result.uploads[1].width * result.uploads[1].height > 1500000) throw new Error('WebP source was not converted to and independently validated as a canonical PNG before product creation');
      if (result.events.slice(5, 7).join(',') !== 'upload,create' || createPayload.image !== result.uploads[1].image) throw new Error('The create flow must upload the photo before creating the product: ' + result.events.join(','));
      await waitFor(() => document.querySelector('#modalBackdrop').hidden, 'WebP product modal close');
      document.querySelector('[data-action="new-product"]').click();
      await waitFor(() => !document.querySelector('#modalBackdrop').hidden && document.querySelector('#modalContent form.modal-form'), 'second real product create form');
      const pngCreateForm = document.querySelector('#modalContent form.modal-form');
      await waitFor(() => !pngCreateForm.elements.namedItem('imageFile').disabled, 'R2 status check for PNG create form');
      pngCreateForm.elements.namedItem('name').value = 'Producto con PNG propio';
      pngCreateForm.elements.namedItem('category').value = 'Bicicletas de montaña';
      pngCreateForm.elements.namedItem('price').value = '125002';
      pngCreateForm.elements.namedItem('stock').value = '2';
      pngCreateForm.elements.namedItem('description').value = 'PNG normal validado desde el formulario.';
      await attachOwnPhoto(pngCreateForm, 'bike-create-native.png', 'image/png', uploadedImageBytes);
      await waitFor(() => pngCreateForm.querySelector('.admin-image-preview img')?.src.startsWith('blob:'), 'PNG source preview');
      await waitFor(() => !pngCreateForm.elements.namedItem('imageFile').disabled, 'PNG normalization to finish before create submit', 15000);
      const pngCreateValid = pngCreateForm.reportValidity();
      pngCreateForm.requestSubmit();
      if (!pngCreateValid) throw new Error('PNG source product form did not pass native validity');
      await waitFor(() => result.creates.length > 1, 'POST for product with PNG source', 15000).catch((error) => { throw new Error(error.message + '; uploadState=' + result.uploadState + '; fetchTrace=' + result.fetchTrace.join('|') + '; events=' + result.events.join(',') + '; uploads=' + JSON.stringify(result.uploads)); });
      const pngCreatePayload = result.creates[1];
      const pngSourceUpload = result.uploads[2];
      if (!result.createValidatorAccepted || !pngCreatePayload.image.startsWith('/api/images/')) throw new Error('Worker product validator rejected a product with PNG source');
      if (result.uploads.length !== 3 || pngSourceUpload.fileName !== 'bike-create-native.png' || pngSourceUpload.fileType !== 'image/png' || !pngSourceUpload.workerValidatorAccepted || pngSourceUpload.width !== 64 || pngSourceUpload.height !== 64) throw new Error('PNG source was not retained as a valid canonical PNG upload');
      if (result.events.slice(7, 9).join(',') !== 'upload,create' || pngCreatePayload.image !== pngSourceUpload.image) throw new Error('The PNG create flow must upload before saving the product: ' + result.events.join(','));
      if (result.imageDeleteRequests !== 0) throw new Error('The UI must never delete old, shared, or orphaned images automatically');
      testData = { viewportWidth: window.innerWidth, previewAlign, originalPrice, editedPrice, configuredStep, libraryImagePreview: selectedImage, editImage: patch.image, editFile: editUpload.fileName, editPngDimensions: editUpload.width + 'x' + editUpload.height, editPngBytes: editUpload.fileSize, editPngIdatChunks: editUpload.chunks.idatCount, editPngTotalChunks: editUpload.chunks.count, sourceJpegPixels: jpegSourceDimensions.width * jpegSourceDimensions.height, createImage: createPayload.image, createFile: result.uploads[1].fileName, pngCreateImage: pngCreatePayload.image, pngCreateFile: pngSourceUpload.fileName, submit: 'requestSubmit', nativeValidity: nativelyValid && createValid && pngCreateValid, productValidatorAccepted: result.serverValidatorAccepted && result.createValidatorAccepted, imageWorkerDecoderAccepted: editUpload.workerValidatorAccepted && result.uploads[1].workerValidatorAccepted && pngSourceUpload.workerValidatorAccepted, jpegConvertedToPng: editUpload.fileName === 'bike-custom.png', webpConvertedToPng: result.uploads[1].fileName === 'bike-create.png', pngSourceConvertedToPng: pngSourceUpload.fileName === 'bike-create-native.png', oversizedImagesRejectedBeforeDecode: result.oversizedImagesRejectedBeforeDecode, decoderCallsForOverLimitFiles: result.overLimitDecoderInvocationCount, invalidFileRejected: true, truncatedImageRejected: true, saveFailureRetainedAndRetried: true, imageDeleteRequests: result.imageDeleteRequests, api: 'in-memory product API; real Worker PNG decoder executed in Chromium' };
      }
      }
    } catch (error) {
      testError = error?.stack || String(error);
    } finally {
      Object.assign(product, originalFixture);
      products.splice(1);
      result.fixtureRestored = Object.keys(originalFixture).every((key) => product[key] === originalFixture[key]);
    }
    if (testError) showResult('FAIL', testError);
    else showResult('PASS', JSON.stringify({ ...testData, fixtureRestored: result.fixtureRestored }));
  });
})();`;
const uploadImageBase64 = validUploadPng.toString('base64');
const sourceJpegBase64 = largeSourceJpegBytes.toString('base64');
const sourceWebpBase64 = sourceWebpBytes.toString('base64');
const oversizedJpegPixelsBase64 = oversizedJpegPixels.toString('base64');
const oversizedJpegSideBase64 = oversizedJpegSide.toString('base64');
const oversizedPngSideBase64 = oversizedPngSide.toString('base64');
const oversizedWebpSideBase64 = oversizedWebpSide.toString('base64');
const uploadEnabledFixture = process.env.BIKESTORE_PRODUCT_FORM_UPLOAD_ENABLED !== 'false';
const headerOnlyMode = process.env.BIKESTORE_PRODUCT_FORM_HEADER_ONLY === 'true';
const completeFixtureBootstrap = fixtureBootstrap
  .replace('/*__WORKER_VALIDATOR__*/', () => workerValidationCode)
  .replace('/*__UPLOAD_IMAGE_BASE64__*/', uploadImageBase64)
  .replace('/*__SOURCE_JPEG_BASE64__*/', sourceJpegBase64)
  .replace('/*__SOURCE_WEBP_BASE64__*/', sourceWebpBase64)
  .replace('/*__OVERSIZED_JPEG_PIXELS__*/', oversizedJpegPixelsBase64)
  .replace('/*__OVERSIZED_JPEG_SIDE__*/', oversizedJpegSideBase64)
  .replace('/*__OVERSIZED_PNG_SIDE__*/', oversizedPngSideBase64)
  .replace('/*__OVERSIZED_WEBP_SIDE__*/', oversizedWebpSideBase64)
  .replace('/*__HEADER_ONLY__*/', String(headerOnlyMode))
  .replace('/*__UPLOAD_ENABLED__*/', String(uploadEnabledFixture));

const fixtureHtml = sourceHtml.replace(
  appScriptTag,
  '<script src="/__fixture-bootstrap.js"></script>\n<script defer="" src="app.js"></script>'
);
const contentTypes = mimeTypes;
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/__fixture-bootstrap.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(completeFixtureBootstrap);
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
    const stepOverride = process.env.BIKESTORE_PRODUCT_FORM_TEST_STEP_OVERRIDE;
    if (url.pathname === '/app.js' && stepOverride) {
      assert.equal(stepOverride, '1000', 'the optional mutation mode only simulates the former 1000-COP step');
      const originalSource = body.toString('utf8');
      const mutatedSource = originalSource.replace("price.querySelector('input').step = '1';", "price.querySelector('input').step = '1000';");
      assert.notEqual(mutatedSource, originalSource, 'the form step assignment must exist in the served app.js');
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(mutatedSource);
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
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
const viewportMode = process.env.BIKESTORE_PRODUCT_FORM_VIEWPORT || 'desktop';
assert.ok(['desktop', 'mobile'].includes(viewportMode), 'BIKESTORE_PRODUCT_FORM_VIEWPORT must be desktop or mobile');
const viewportSize = viewportMode === 'mobile' ? '390,844' : '1280,900';
const args = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
  `--window-size=${viewportSize}`, '--virtual-time-budget=60000', '--dump-dom', url
];
let stdout = '';
let stderr = '';
const browser = spawn(chromiumPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
browser.stdout.setEncoding('utf8');
browser.stderr.setEncoding('utf8');
browser.stdout.on('data', (chunk) => { stdout += chunk; });
browser.stderr.on('data', (chunk) => { stderr += chunk; });
const timeout = setTimeout(() => browser.kill('SIGKILL'), 45000);
const exitCode = await new Promise((resolve, reject) => {
  browser.once('error', reject);
  browser.once('close', (code) => resolve(code));
});
clearTimeout(timeout);
await new Promise((resolve) => server.close(resolve));
const passMatch = stdout.match(/<pre id="product-form-regression-result" data-status="PASS">([^<]*)<\/pre>/);
if (exitCode !== 0 || !passMatch) {
  const failMatch = stdout.match(/<pre id="product-form-regression-result" data-status="FAIL">([^<]*)<\/pre>/);
  const pageResult = failMatch ? failMatch[1] : 'No pasó la prueba o Chromium no completó la carga.';
  throw new Error(`${pageResult}\nChromium exit code: ${exitCode}\n${stderr.slice(-2500)}`);
}
const browserResult = JSON.parse(passMatch[1]);
assert.equal(browserResult.viewportWidth <= 640, viewportMode === 'mobile', `Chromium did not use the requested ${viewportMode} viewport`);
console.log(`PASS product form regression in Chromium (${viewportMode}): ${passMatch[1]}`);
console.log('PASS isolated fixture: local static server, in-memory API mock, no auth backend, no D1, no production URL');
