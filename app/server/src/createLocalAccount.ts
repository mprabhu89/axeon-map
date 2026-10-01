import { loadServerConfiguration } from './config.js';
import { createLocalAccountStore } from './localAccountStore.js';
import { verifyPassword } from './passwords.js';
import type { AxeonRole } from './authentication.js';

const administratorUsername = process.env.AXEON_ADMIN_USERNAME;
const administratorPassword = process.env.AXEON_ADMIN_PASSWORD;
const username = process.env.AXEON_NEW_USERNAME;
const password = process.env.AXEON_NEW_PASSWORD;
const requestedRole = process.env.AXEON_NEW_ROLE ?? 'user';
if (!administratorUsername || !administratorPassword || !username || !password) throw new Error('Set AXEON_ADMIN_USERNAME, AXEON_ADMIN_PASSWORD, AXEON_NEW_USERNAME, and AXEON_NEW_PASSWORD before creating a local account.');
if (requestedRole !== 'administrator' && requestedRole !== 'user') throw new Error('AXEON_NEW_ROLE must be administrator or user.');

const accounts = createLocalAccountStore(loadServerConfiguration().accountStorePath);
const administrator = await accounts.findByUsername(administratorUsername);
if (!administrator || administrator.role !== 'administrator' || !await verifyPassword(administratorPassword, administrator.passwordHash)) throw new Error('Local account creation requires a valid Axeon Administrator account.');
await accounts.create(username, password, requestedRole as AxeonRole);
console.info('Local Axeon account created. Remove account passwords from your shell environment.');
