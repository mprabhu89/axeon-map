import { loadServerConfiguration } from './config.js';
import { createLocalAccountAsAdministrator, LocalAccountCreationAuthorizationError } from './localAccountCreation.js';
import { createLocalAccountStore } from './localAccountStore.js';
import type { AxeonRole } from './authentication.js';

const administratorUsername = process.env.AXEON_ADMIN_USERNAME;
const administratorPassword = process.env.AXEON_ADMIN_PASSWORD;
const username = process.env.AXEON_NEW_USERNAME;
const password = process.env.AXEON_NEW_PASSWORD;
const requestedRole = process.env.AXEON_NEW_ROLE ?? 'user';
if (!administratorUsername || !administratorPassword || !username || !password) throw new Error('Set AXEON_ADMIN_USERNAME, AXEON_ADMIN_PASSWORD, AXEON_NEW_USERNAME, and AXEON_NEW_PASSWORD before creating a local account.');
if (requestedRole !== 'administrator' && requestedRole !== 'user') throw new Error('AXEON_NEW_ROLE must be administrator or user.');

const configuration = loadServerConfiguration();
const accounts = createLocalAccountStore(configuration.accountStorePath);
try {
  await createLocalAccountAsAdministrator(accounts, {
    administratorUsername,
    administratorPassword,
    username,
    password,
    role: requestedRole as AxeonRole,
  });
} catch (error) {
  if (error instanceof LocalAccountCreationAuthorizationError) {
    console.error(`Axeon local account diagnostic: account-store path=${configuration.accountStorePath}; administrator verification=${error.status}.`);
  }
  throw error;
}
console.info('Local Axeon account created. Remove account passwords from your shell environment.');
