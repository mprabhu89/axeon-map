import { loadServerConfiguration } from './config.js';
import { createLocalAccountStore } from './localAccountStore.js';

const username = process.env.AXEON_BOOTSTRAP_ADMIN_USERNAME;
const password = process.env.AXEON_BOOTSTRAP_ADMIN_PASSWORD;
if (!username || !password) throw new Error('Set AXEON_BOOTSTRAP_ADMIN_USERNAME and AXEON_BOOTSTRAP_ADMIN_PASSWORD before creating the initial local administrator.');

const configuration = loadServerConfiguration();
await createLocalAccountStore(configuration.accountStorePath).bootstrapAdministrator(username, password);
console.info('Initial Axeon administrator created. Remove the bootstrap password from your shell environment.');
