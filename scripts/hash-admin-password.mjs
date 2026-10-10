import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.env.BIKESTORE_ADMIN_PASSWORD;
if (!password) throw new Error('Define BIKESTORE_ADMIN_PASSWORD en el entorno.');
const salt = randomBytes(16);
const iterations = 100_000;
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const b64url = (value) => value.toString('base64url');
process.stdout.write(`pbkdf2-sha256$${iterations}$${b64url(salt)}$${b64url(hash)}\n`);
