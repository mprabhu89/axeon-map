// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { createLocalAccountStore } from './localAccountStore.js';
import { createLocalAuthenticationProvider, LoginThrottle } from './localAuthentication.js';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function store() { const directory = await mkdtemp(join(tmpdir(), 'axeon-auth-')); directories.push(directory); return { store: createLocalAccountStore(join(directory, 'accounts.json')), path: join(directory, 'accounts.json') }; }

test('initial administrator bootstrap creates only a hashed administrator account', async () => {
  const { store: accounts, path } = await store();
  const account = await accounts.bootstrapAdministrator('Axeon.Admin', 'A-strong-local-password');
  expect(account).toMatchObject({ username: 'axeon.admin', role: 'administrator' });
  expect(account.passwordHash).toMatch(/^scrypt\$/);
  expect(await readFile(path, 'utf8')).not.toContain('A-strong-local-password');
  await expect(accounts.bootstrapAdministrator('second.admin', 'Another-strong-password')).rejects.toThrow('bootstrap');
  expect(await accounts.create('axeon.user', 'A-strong-local-user-password', 'user')).toMatchObject({ role: 'user', username: 'axeon.user' });
});

test('local authentication returns a principal only for a valid password and throttles repeated failures', async () => {
  const { store: accounts } = await store(); await accounts.bootstrapAdministrator('axeon.admin', 'A-strong-local-password');
  let clock = 1_000;
  const throttle = new LoginThrottle(() => clock, 2, 60_000, 60_000);
  const provider = createLocalAuthenticationProvider(accounts, throttle, () => clock);
  const valid = await provider.authenticate({ username: 'axeon.admin', password: 'A-strong-local-password', remoteAddress: '127.0.0.1' });
  expect(valid).toMatchObject({ status: 'authenticated', principal: { role: 'administrator', authenticationMethod: 'password-session' } });
  expect(await provider.authenticate({ username: 'axeon.admin', password: 'wrong-password', remoteAddress: '127.0.0.1' })).toMatchObject({ status: 'invalid-credentials' });
  expect(await provider.authenticate({ username: 'axeon.admin', password: 'wrong-password', remoteAddress: '127.0.0.1' })).toMatchObject({ status: 'throttled' });
  clock += 61_000;
  expect(await provider.authenticate({ username: 'axeon.admin', password: 'A-strong-local-password', remoteAddress: '127.0.0.1' })).toMatchObject({ status: 'authenticated' });
});
