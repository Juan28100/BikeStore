import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const source = await readFile(path.join(projectRoot, 'src/worker.js'), 'utf8');
const applicationStart = source.indexOf('var ADMIN_EMAIL =');
const exportsStart = source.lastIndexOf('\nexport {');
assert.ok(applicationStart >= 0 && exportsStart > applicationStart, 'expected bundled Worker application section');
const appSource = source.slice(applicationStart, exportsStart);
const vmContext = vm.createContext({
  console, crypto: webcrypto, Request, Response, Headers, URL, FormData, Blob,
  TextEncoder, TextDecoder, atob, btoa, setTimeout, clearTimeout, fetch, structuredClone,
  DecompressionStream
});
vm.runInContext(`
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, 'name', { value, configurable: true });
  ${appSource}
  globalThis.__testWorker = worker_default;
  globalThis.__testValidateProductImageBytes = validateProductImageBytes;
`, vmContext, { timeout: 10000 });
const worker = vmContext.__testWorker;
const validateProductImageBytes = vmContext.__testValidateProductImageBytes;

const origin = 'https://bikestore-test.example';
const adminCookie = '__Host-bikestore_session=synthetic-test-token';
const adminUser = {
  id: 'mock-admin', name: 'Admin local', email: 'jjcorreagetial16@gmail.com',
  role: 'admin', email_verified_at: 1, account_type: 'account'
};
const customerUser = {
  id: 'mock-customer', name: 'Cliente local', email: 'cliente@example.test',
  role: 'customer', email_verified_at: 1, account_type: 'account'
};

const TEST_PNG_CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? value >>> 1 ^ 0xedb88320 : value >>> 1;
  TEST_PNG_CRC_TABLE[index] = value >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = TEST_PNG_CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, payload) {
  const typeBytes = Buffer.from(type, 'ascii');
  const data = Buffer.from(payload);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}
function makePng(width, height, bitDepth, colorType, decodedBytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = bitDepth; header[9] = colorType; // Standard compression/filter, non-interlaced.
  const pixels = deflateSync(decodedBytes);
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('IDAT', pixels), pngChunk('IEND', Buffer.alloc(0))]);
}
function makeValidPng(filterByte = 0, extraDecodedBytes = Buffer.alloc(0)) {
  return makePng(1, 1, 8, 6, Buffer.concat([Buffer.from([filterByte, 12, 34, 56, 255]), extraDecodedBytes]));
}
function makeIndexedPng(indexByte = 0) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 1; header[9] = 3;
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('PLTE', Buffer.from([0, 0, 0])), pngChunk('IDAT', deflateSync(Buffer.from([0, indexByte]))), pngChunk('IEND', Buffer.alloc(0))]);
}
function makeIndexedFilterPng(filter) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13); header.writeUInt32BE(2, 0); header.writeUInt32BE(2, 4); header[8] = 1; header[9] = 3;
  const predictor = filter === 2 || filter === 4 ? 0x40 : filter === 3 ? 0x20 : 0;
  const secondRowEncodedByte = (0x80 - predictor) & 255;
  const pixels = deflateSync(Buffer.from([0, 0x40, filter, secondRowEncodedByte]));
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])), pngChunk('IDAT', pixels), pngChunk('IEND', Buffer.alloc(0))]);
}
function makeIndexedPaeth16MpPng() {
  const width = 4000, height = 4000, rowBytes = Math.ceil(width / 8), rowStride = rowBytes + 1;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 1; header[9] = 3;
  const raw = Buffer.alloc(rowStride * height);
  for (let row = 0; row < height; row += 1) raw[row * rowStride] = 4;
  const compressed = deflateSync(raw);
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('PLTE', Buffer.from([0, 0, 0])), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}
function makeAncillaryChunkFlood(count) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  const data = pngChunk('IDAT', deflateSync(Buffer.from([0, 12, 34, 56, 255])));
  const ancillaryChunk = pngChunk('vpAg', Buffer.alloc(0));
  const ancillary = Buffer.alloc(ancillaryChunk.length * count);
  for (let offset = 0; offset < ancillary.length; offset += ancillaryChunk.length) ancillaryChunk.copy(ancillary, offset);
  return Buffer.concat([signature, pngChunk('IHDR', header), ancillary, data, pngChunk('IEND', Buffer.alloc(0))]);
}
function makeManyIdatChunks(count) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  const emptyIdat = pngChunk('IDAT', Buffer.alloc(0));
  const emptyChunks = Buffer.alloc(emptyIdat.length * count);
  for (let offset = 0; offset < emptyChunks.length; offset += emptyIdat.length) emptyIdat.copy(emptyChunks, offset);
  const data = pngChunk('IDAT', deflateSync(Buffer.from([0, 12, 34, 56, 255])));
  return Buffer.concat([signature, pngChunk('IHDR', header), emptyChunks, data, pngChunk('IEND', Buffer.alloc(0))]);
}
function makeFakeJpeg28() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00, 0xff, 0xd9]);
}
function makeFakeWebp52() {
  const bytes = Buffer.alloc(52);
  bytes.write('RIFF', 0, 'ascii'); bytes.writeUInt32LE(44, 4); bytes.write('WEBP', 8, 'ascii');
  bytes.write('VP8X', 12, 'ascii'); bytes.writeUInt32LE(10, 16);
  bytes.write('VP8 ', 30, 'ascii'); bytes.writeUInt32LE(14, 34);
  bytes[41] = 157; bytes[42] = 1; bytes[43] = 42; bytes.writeUInt16LE(1, 44); bytes.writeUInt16LE(1, 46);
  return bytes;
}
const validPng = await readFile(path.join(projectRoot, 'tests/fixtures/valid-product-rgb.png'));
const validPngRgba = await readFile(path.join(projectRoot, 'tests/fixtures/valid-product-rgba.png'));
const validPngPalette = await readFile(path.join(projectRoot, 'tests/fixtures/valid-product-palette.png'));
const realJpeg = await readFile(path.join(projectRoot, 'public/assets/bikestore/bike-mountain.jpg'));
const realWebp = await readFile(path.join(projectRoot, 'tests/fixtures/real-product-photo.webp'));
const fakeJpeg28 = makeFakeJpeg28();
const fakeWebp52 = makeFakeWebp52();
const invalidPngFilter = makeValidPng(5);
const invalidPaletteIndex = makeIndexedPng(0x80);
const indexedFilterSamples = [0, 1, 2, 3, 4].map((filter) => makeIndexedFilterPng(filter));
const indexedPaeth16MpPng = makeIndexedPaeth16MpPng();
const ancillaryChunkAttack = makeAncillaryChunkFlood(1000);
const ancillary699044Attack = makeAncillaryChunkFlood(699044);
const maximumIdatChunks = makeManyIdatChunks(1023); // 1023 empty IDAT chunks plus one data IDAT.
const tooManyIdatChunks = makeManyIdatChunks(1024); // One over the 1024-IDAT ceiling.
const oversizedDimensionPng = makePng(1601, 1, 8, 6, Buffer.from([0]));
const oversizedPixelCountPng = makePng(1501, 1000, 8, 6, Buffer.from([0]));
const oversizedDecodedPng = makePng(1200, 1200, 16, 6, Buffer.from([0]));
const expansionMismatchPng = makePng(100, 100, 8, 6, Buffer.alloc(40101));
assert.equal(fakeJpeg28.length, 28);
assert.equal(fakeWebp52.length, 52);

function makeDatabase(user) {
  const stats = { reads: 0, writes: 0 };
  const database = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          stats.reads += 1;
          return sql.includes('FROM sessions s JOIN users u') ? user : null;
        },
        async run() { stats.writes += 1; throw new Error('Unexpected D1 write in image upload test'); },
        async all() { stats.reads += 1; return { results: [] }; }
      };
    },
    async batch() { stats.writes += 1; throw new Error('Unexpected D1 batch in image upload test'); },
    stats
  };
  return database;
}

function makeBucket() {
  const objects = new Map();
  const stats = { puts: 0, gets: 0, deletes: 0 };
  return {
    objects, stats,
    async put(key, value, options) {
      stats.puts += 1;
      objects.set(key, {
        bytes: new Uint8Array(value),
        contentType: options?.httpMetadata?.contentType || '',
        cacheControl: options?.httpMetadata?.cacheControl || ''
      });
    },
    async get(key) {
      stats.gets += 1;
      const stored = objects.get(key);
      if (!stored) return null;
      return {
        body: new Response(stored.bytes).body,
        httpEtag: '"mock-image-etag"',
        writeHttpMetadata(headers) {
          headers.set('Content-Type', stored.contentType);
          headers.set('Cache-Control', stored.cacheControl);
        }
      };
    },
    async delete(key) { stats.deletes += 1; objects.delete(key); }
  };
}

function makeEnv({ user = adminUser, withBucket = true, uploadsEnabled = true, cpuVerified = true } = {}) {
  const DB = makeDatabase(user);
  const PRODUCT_IMAGES = withBucket ? makeBucket() : undefined;
  const env = { DB, PRODUCT_IMAGES, PRODUCT_IMAGE_UPLOADS_ENABLED: uploadsEnabled ? 'true' : 'false', PRODUCT_IMAGE_UPLOADS_CPU_VERIFIED: cpuVerified ? 'true' : 'false' };
  return { env, DB, PRODUCT_IMAGES };
}
function uploadRequest(bytes = validPng, contentType = 'image/png', cookie = adminCookie, filename = 'product.png') {
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: contentType }), filename);
  return new Request(`${origin}/api/admin/images`, {
    method: 'POST', headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: form
  });
}
function statusRequest(cookie = adminCookie) {
  return new Request(`${origin}/api/admin/images/status`, { headers: cookie ? { Cookie: cookie } : {} });
}
async function call(request, env) {
  return worker.fetch(request, env, {});
}

// Accept only canonical server-decoded RGB/RGBA PNGs; browser-side decoding is not trusted by the API.
for (const [label, sample] of [['RGB photo', validPng], ['RGBA photo', validPngRgba]]) {
  const parsed = await validateProductImageBytes(new Uint8Array(sample), 'image/png');
  assert.equal(parsed?.extension, 'png', `${label} must decode on the Worker`);
}
assert.equal(await validateProductImageBytes(new Uint8Array(validPngPalette), 'image/png'), null, 'indexed/palette PNGs must be rejected to avoid per-pixel Paeth reconstruction');
assert.equal(await validateProductImageBytes(new Uint8Array(realJpeg), 'image/jpeg'), null, 'a real JPEG must be rejected because the Worker does not decode JPEG');
assert.equal(await validateProductImageBytes(new Uint8Array(realWebp), 'image/webp'), null, 'a real WebP must be rejected because the Worker does not decode WebP');
assert.equal(await validateProductImageBytes(new Uint8Array(fakeJpeg28), 'image/jpeg'), null, 'the 28-byte forged JPEG must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(fakeWebp52), 'image/webp'), null, 'the 52-byte forged WebP must be rejected');
const tinyPng = makeValidPng();
assert.equal(await validateProductImageBytes(new Uint8Array(validPng.subarray(0, validPng.length - 12)), 'image/png'), null, 'PNG without IEND must be rejected');
const badCrcPng = Buffer.from(tinyPng); badCrcPng[29] ^= 0xff;
assert.equal(await validateProductImageBytes(new Uint8Array(badCrcPng), 'image/png'), null, 'bad PNG chunk CRC must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(invalidPngFilter), 'image/png'), null, 'invalid PNG scanline filter must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(invalidPaletteIndex), 'image/png'), null, 'palette PNG indices outside PLTE must be rejected after unfiltering');
for (let filter = 0; filter <= 4; filter += 1) assert.equal(await validateProductImageBytes(new Uint8Array(indexedFilterSamples[filter]), 'image/png'), null, `indexed PNG filter ${filter} must be rejected before unfiltering`);
assert.equal(await validateProductImageBytes(new Uint8Array(indexedPaeth16MpPng), 'image/png'), null, 'the 16 MP indexed Paeth attack must be rejected from its header before inflate or pixel iteration');
assert.ok(ancillary699044Attack.length < 8 * 1024 * 1024 && ancillary699044Attack.length > 4 * 1024 * 1024, 'the 699044-chunk bomb must fit under the previous 8 MiB limit and exceed the new cap');
assert.equal(await validateProductImageBytes(new Uint8Array(ancillaryChunkAttack), 'image/png'), null, 'ancillary chunks must be rejected immediately');
assert.equal((await validateProductImageBytes(new Uint8Array(maximumIdatChunks), 'image/png'))?.extension, 'png', 'the Worker must accept the maximum bounded IDAT count used by browser encoders');
assert.equal(await validateProductImageBytes(new Uint8Array(tooManyIdatChunks), 'image/png'), null, 'more than 1024 IDAT / 1026 total chunks must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(oversizedDimensionPng), 'image/png'), null, 'a dimension above 1600px must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(oversizedPixelCountPng), 'image/png'), null, 'more than 1.5 million pixels must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(oversizedDecodedPng), 'image/png'), null, 'decoded data above 6 MiB must be rejected from the header before inflate');
assert.equal(await validateProductImageBytes(new Uint8Array(expansionMismatchPng), 'image/png'), null, 'inflated data longer than the declared pixel raster must be rejected');
assert.equal(await validateProductImageBytes(new TextEncoder().encode('<script>bad</script>'), 'image/png'), null, 'HTML with image MIME must be rejected');
assert.equal(await validateProductImageBytes(new Uint8Array(validPng), 'image/jpeg'), null, 'MIME mismatch must be rejected');

const { env: adminEnv, DB: adminDB, PRODUCT_IMAGES: bucket } = makeEnv();
const statusResponse = await call(statusRequest(), adminEnv);
assert.equal(statusResponse.status, 200);
assert.equal(statusResponse.headers.get('Cache-Control'), 'no-store', 'admin upload status must not be cached');
assert.equal((await statusResponse.json()).enabled, true, 'uploads are enabled only in the explicitly configured fixture');

const uploadResponse = await call(uploadRequest(validPng, 'image/png', adminCookie, 'valid.png'), adminEnv);
assert.equal(uploadResponse.status, 201, 'authorized admin upload should succeed with a real RGB PNG and an explicitly enabled mock R2 bucket');
const uploadedPng = await uploadResponse.json();
assert.match(uploadedPng.image, /^\/api\/images\/[0-9a-f-]{36}\.png$/);
const secondPngResponse = await call(uploadRequest(validPngRgba, 'image/png', adminCookie, 'valid-rgba.png'), adminEnv);
assert.equal(secondPngResponse.status, 201, 'a real RGBA PNG should also pass full Worker decoding');
const uploadedPngRgba = await secondPngResponse.json();
assert.match(uploadedPngRgba.image, /^\/api\/images\/[0-9a-f-]{36}\.png$/);
assert.notEqual(uploadedPng.image, uploadedPngRgba.image, 'each upload must use a unique immutable object key');
assert.equal(bucket.stats.puts, 2);
assert.equal(bucket.objects.size, 2, 'previously stored images remain available when a new image is uploaded');

for (const [imagePath, expectedType, expectedBytes] of [[uploadedPng.image, 'image/png', validPng], [uploadedPngRgba.image, 'image/png', validPngRgba]]) {
  const publicImageResponse = await call(new Request(`${origin}${imagePath}`), adminEnv);
  assert.equal(publicImageResponse.status, 200, 'uploaded images should be publicly readable by their opaque path');
  assert.equal(publicImageResponse.headers.get('Content-Type'), expectedType);
  assert.equal(publicImageResponse.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal(publicImageResponse.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual([...new Uint8Array(await publicImageResponse.arrayBuffer())], [...expectedBytes]);
}

const invalidPathResponse = await call(new Request(`${origin}/api/images/not-a-valid-key.png`), adminEnv);
assert.equal(invalidPathResponse.status, 404);
const missingObjectResponse = await call(new Request(`${origin}/api/images/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png`), adminEnv);
assert.equal(missingObjectResponse.status, 404);

const unauthorizedEnv = makeEnv();
assert.equal((await call(statusRequest(''), unauthorizedEnv.env)).status, 401, 'image status requires an existing admin session');
const unauthorizedResponse = await call(uploadRequest(validPng, 'image/png', ''), unauthorizedEnv.env);
assert.equal(unauthorizedResponse.status, 401, 'upload without an existing session must be rejected');
assert.equal(unauthorizedEnv.PRODUCT_IMAGES.stats.puts, 0);

const customerEnv = makeEnv({ user: customerUser });
assert.equal((await call(statusRequest(), customerEnv.env)).status, 403, 'customers must not inspect admin image upload status');
const customerResponse = await call(uploadRequest(), customerEnv.env);
assert.equal(customerResponse.status, 403, 'customer accounts must not upload product images');
assert.equal(customerEnv.PRODUCT_IMAGES.stats.puts, 0);

const noR2Env = makeEnv({ withBucket: false });
assert.equal((await (await call(statusRequest(), noR2Env.env)).json()).enabled, false, 'missing R2 binding must keep upload disabled');
const noR2Response = await call(uploadRequest(), noR2Env.env);
assert.equal(noR2Response.status, 503, 'the feature should fail clearly until PRODUCT_IMAGES is bound');
assert.match((await noR2Response.json()).error, /R2/i);
const noActivationEnv = makeEnv({ uploadsEnabled: false });
assert.equal((await (await call(statusRequest(), noActivationEnv.env)).json()).enabled, false, 'a bucket alone must not enable uploads without explicit activation');
assert.equal((await call(uploadRequest(), noActivationEnv.env)).status, 503);
const noCpuVerificationEnv = makeEnv({ cpuVerified: false });
const noCpuStatus = await (await call(statusRequest(), noCpuVerificationEnv.env)).json();
assert.equal(noCpuStatus.enabled, false, 'a bucket and explicit upload flag must not enable uploads until worst-case CPU is verified');
assert.match(noCpuStatus.message, /CPU_VERIFIED/i);
const noCpuUpload = await call(uploadRequest(), noCpuVerificationEnv.env);
assert.equal(noCpuUpload.status, 503);
assert.match((await noCpuUpload.json()).error, /CPU_VERIFIED/i);
assert.equal(noCpuVerificationEnv.PRODUCT_IMAGES.stats.puts, 0);

const invalidUploads = [
  [new TextEncoder().encode('<script>alert(1)</script>'), 'image/png', 415, 'spoofed HTML'],
  [validPng.subarray(0, validPng.length - 12), 'image/png', 415, 'truncated PNG'],
  [badCrcPng, 'image/png', 415, 'bad PNG CRC'],
  [invalidPngFilter, 'image/png', 415, 'invalid PNG filter'],
  [validPngPalette, 'image/png', 415, 'indexed PNG is not canonical'],
  [invalidPaletteIndex, 'image/png', 415, 'palette PNG is not canonical'],
  [indexedPaeth16MpPng, 'image/png', 415, '16 MP indexed Paeth CPU attack'],
  [ancillaryChunkAttack, 'image/png', 415, 'ancillary chunk flood'],
  [tooManyIdatChunks, 'image/png', 415, 'excessive IDAT chunk count'],
  [oversizedDimensionPng, 'image/png', 415, 'dimension above 1600px'],
  [oversizedPixelCountPng, 'image/png', 415, 'more than 1.5 million pixels'],
  [oversizedDecodedPng, 'image/png', 415, 'decoded expansion above 6 MiB'],
  [expansionMismatchPng, 'image/png', 415, 'incorrect decompressed length'],
  [fakeJpeg28, 'image/jpeg', 415, 'forged 28-byte JPEG'],
  [fakeWebp52, 'image/webp', 415, 'forged 52-byte WebP'],
  [realJpeg, 'image/jpeg', 415, 'real JPEG unsupported by server decoder'],
  [realWebp, 'image/webp', 415, 'real WebP unsupported by server decoder'],
  [validPng, 'image/jpeg', 415, 'mismatched MIME']
];
for (const [bytes, type, expectedStatus, label] of invalidUploads) {
  const response = await call(uploadRequest(bytes, type), adminEnv);
  assert.equal(response.status, expectedStatus, `${label} must be rejected before R2.put`);
}
const oversizedBytes = new Uint8Array(4 * 1024 * 1024 + 1);
oversizedBytes.set(validPng.subarray(0, 8));
assert.equal((await call(uploadRequest(oversizedBytes, 'image/png'), adminEnv)).status, 413, 'uploads over 4 MiB must be rejected');
assert.equal((await call(uploadRequest(ancillary699044Attack, 'image/png', adminCookie, '699044-chunks.png'), adminEnv)).status, 413, 'the historical 699044-chunk body must be rejected by the new 4 MiB request cap');
assert.equal(bucket.stats.puts, 2, 'rejected or malformed files must not be written to R2');

// There is deliberately no automatic garbage collector or image DELETE route.
// Replaced, shared, soft-deleted, and unassociated objects are retained until a future
// reference-aware manual cleanup is configured and audited against production data.
assert.doesNotMatch(source, /PRODUCT_IMAGES\.delete\s*\(/, 'the Worker must never automatically delete R2 objects');
const deleteResponse = await call(new Request(`${origin}/api/admin/images/${uploadedPng.image.split('/').at(-1)}`, {
  method: 'DELETE', headers: { Origin: origin, Cookie: adminCookie }
}), adminEnv);
assert.equal(deleteResponse.status, 404, 'there must be no automatic or direct image-delete endpoint');
assert.equal(bucket.stats.deletes, 0);
assert.equal(bucket.objects.size, 2, 'the earlier object must remain after another upload');

assert.equal(adminDB.stats.writes, 0, 'image routes must not write to D1');
assert.equal(unauthorizedEnv.DB.stats.writes, 0);
assert.equal(customerEnv.DB.stats.writes, 0);
assert.equal(noR2Env.DB.stats.writes, 0);
assert.equal(noActivationEnv.DB.stats.writes, 0);
assert.equal(noCpuVerificationEnv.DB.stats.writes, 0);

if (process.env.BIKESTORE_IMAGE_DECODER_BENCHMARK === '1') {
  const width = 1500;
  const height = 1000;
  const rowStride = width * 4 + 1;
  const decodedPixels = Buffer.alloc(rowStride * height);
  let randomState = 0x6d2b79f5;
  for (let row = 0; row < height; row += 1) {
    const rowStart = row * rowStride;
    decodedPixels[rowStart] = 0;
    for (let offset = rowStart + 1; offset < rowStart + rowStride; offset += 1) {
      randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
      decodedPixels[offset] = randomState & 0x1f;
    }
  }
  const compressedPixels = deflateSync(decodedPixels);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const idatChunks = [];
  for (let offset = 0; offset < compressedPixels.length; offset += 4096) idatChunks.push(pngChunk('IDAT', compressedPixels.subarray(offset, offset + 4096)));
  const nearLimitPng = Buffer.concat([signature, pngChunk('IHDR', header), ...idatChunks, pngChunk('IEND', Buffer.alloc(0))]);
  assert.ok(nearLimitPng.length <= 4 * 1024 * 1024, `worst-case benchmark PNG must stay under 4 MiB (actual ${nearLimitPng.length})`);
  assert.ok(idatChunks.length <= 1024, `browser-like IDAT count must stay under its bound (actual ${idatChunks.length})`);
  const cpuStart = process.cpuUsage();
  const wallStart = performance.now();
  const benchmarkResult = await validateProductImageBytes(new Uint8Array(nearLimitPng), 'image/png');
  const wallMs = performance.now() - wallStart;
  const cpu = process.cpuUsage(cpuStart);
  assert.equal(benchmarkResult?.extension, 'png', 'maximum-boundary benchmark fixture must be a valid canonical PNG');
  console.log(`BENCH image decoder: input=${nearLimitPng.length} bytes, decoded=${decodedPixels.length} bytes, dimensions=${width}x${height}, idat_chunks=${idatChunks.length}, cpu_ms=${((cpu.user + cpu.system) / 1000).toFixed(1)}, wall_ms=${wallMs.toFixed(1)} (Node local; not a Cloudflare CPU guarantee)`);
}

console.log('PASS image-upload-worker-smoke: full Worker PNG decode (RGB/RGBA accepted; indexed palette rejected), forged 28-byte JPEG and 52-byte WebP rejected, unsupported real JPEG/WebP rejected, PNG filter/CRC/truncation checks, 1024-IDAT boundary, resource limits, explicit R2/CPU gate, retention, admin authorization, public read, and zero D1 writes');
