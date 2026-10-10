import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expectedPublicAssets } from './public-assets-allowlist.mjs';

const root = path.resolve('public');
const forbiddenText = [/Smoke(?:Admin|Test)!/i, /\{\{secret:/i, /BIKESTORE_ADMIN_PASSWORD/i, /jjcorreagetial16@gmail\.com/i];
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full).split(path.sep).join('/');
    assert.ok(entry.isDirectory() || entry.isFile(), `unsupported public asset type: ${relative}`);
    if (entry.isDirectory()) await walk(full);
    else files.push({ full, relative });
  }
}
await walk(root);
const actual = files.map((file) => file.relative).sort();
const expected = [...expectedPublicAssets].sort();
assert.deepEqual(actual, expected, `public/ inventory differs from allowlist\nActual: ${actual.join(', ')}\nExpected: ${expected.join(', ')}`);
for (const file of files) {
  const text = await readFile(file.full, 'utf8');
  for (const pattern of forbiddenText) assert.ok(!pattern.test(text), `sensitive/test string in public asset ${file.relative}: ${pattern}`);
}
console.log(`PASS public allowlist: exact ${actual.length}-file inventory, no unexpected files or sensitive strings`);
