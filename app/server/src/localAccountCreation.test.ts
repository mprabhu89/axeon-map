// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { createLocalAccountAsAdministrator, inspectAdministratorAuthorization } from './localAccountCreation.js';
import { createLocalAccountStore } from './localAccountStore.js';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

async function accountStore() {
  const directory = await mkdtemp(join(tmpdir(), 'axeon-account-creation-'));
  directories.push(directory);
  return createLocalAccountStore(join(directory, 'accounts.json'));
}

test('a browser-login-valid administrator can authorize local account creation through the shared password flow', async () => {
  const accounts = await accountStore();
  await accounts.bootstrapAdministrator('Axeon.Admin', 'A-strong-local-password');

  const created = await createLocalAccountAsAdministrator(accounts, {
    administratorUsername: ' AXEON.ADMIN ',
    administratorPassword: 'A-strong-local-password',
    username: 'site.a.user',
    password: 'A-strong-site-password',
    role: 'user',
  });

  expect(created).toMatchObject({ username: 'site.a.user', role: 'user' });
  expect(await accounts.findByUsername('site.a.user')).toMatchObject({ username: 'site.a.user', role: 'user' });
});

test('a non-administrator or invalid administrator password cannot authorize local account creation', async () => {
  const accounts = await accountStore();
  await accounts.bootstrapAdministrator('axeon.admin', 'A-strong-local-password');
  await accounts.create('axeon.user', 'A-strong-local-user-password', 'user');

  await expect(createLocalAccountAsAdministrator(accounts, {
    administratorUsername: 'axeon.user', administratorPassword: 'A-strong-local-user-password',
    username: 'site.a.user', password: 'A-strong-site-password', role: 'user',
  })).rejects.toThrow('valid Axeon Administrator');
  await expect(createLocalAccountAsAdministrator(accounts, {
    administratorUsername: 'axeon.admin', administratorPassword: 'wrong-password',
    username: 'site.a.user', password: 'A-strong-site-password', role: 'user',
  })).rejects.toThrow('valid Axeon Administrator');
});

test('CLI-safe diagnostics distinguish the configured-store administrator state without returning account secrets', async () => {
  const accounts = await accountStore();
  await accounts.bootstrapAdministrator('axeon.admin', 'A-strong-local-password');
  await accounts.create('axeon.user', 'A-strong-local-user-password', 'user');

  await expect(inspectAdministratorAuthorization(accounts, 'missing.admin', 'A-strong-local-password')).resolves.toBe('administrator-not-found');
  await expect(inspectAdministratorAuthorization(accounts, 'axeon.user', 'A-strong-local-user-password')).resolves.toBe('administrator-role-required');
  await expect(inspectAdministratorAuthorization(accounts, 'axeon.admin', 'wrong-password')).resolves.toBe('administrator-password-not-verified');
  await expect(inspectAdministratorAuthorization(accounts, 'axeon.admin', 'A-strong-local-password')).resolves.toBe('verified');
});
