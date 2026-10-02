import type { AxeonRole } from './authentication.js';
import { normalizeUsername, type LocalAxeonAccount, type LocalAccountStore } from './localAccountStore.js';
import { createLocalAuthenticationProvider } from './localAuthentication.js';

export interface AdministratorAuthorizedAccountRequest {
  readonly administratorUsername: string;
  readonly administratorPassword: string;
  readonly username: string;
  readonly password: string;
  readonly role: AxeonRole;
}

export type AdministratorAuthorizationStatus = 'verified' | 'invalid-administrator-username' | 'administrator-not-found' | 'administrator-role-required' | 'administrator-password-not-verified';

export class LocalAccountCreationAuthorizationError extends Error {
  constructor(readonly status: Exclude<AdministratorAuthorizationStatus, 'verified'>) {
    super('Local account creation requires a valid Axeon Administrator account.');
  }
}

/**
 * Produces a CLI-safe status only. It never returns account content, hashes,
 * password values, sessions, or authentication tokens.
 */
export async function inspectAdministratorAuthorization(
  accounts: LocalAccountStore,
  administratorUsername: string,
  administratorPassword: string,
): Promise<AdministratorAuthorizationStatus> {
  let normalizedUsername: string;
  try { normalizedUsername = normalizeUsername(administratorUsername); }
  catch { return 'invalid-administrator-username'; }
  const account = await accounts.findByUsername(normalizedUsername);
  if (!account) return 'administrator-not-found';
  if (account.role !== 'administrator') return 'administrator-role-required';
  const result = await createLocalAuthenticationProvider(accounts).authenticate({
    username: normalizedUsername,
    password: administratorPassword,
    remoteAddress: 'local-account-cli',
  });
  return result.status === 'authenticated' && result.principal.role === 'administrator' ? 'verified' : 'administrator-password-not-verified';
}

/**
 * Creates a local account only after the same local-password authentication
 * flow used by the HTTP login endpoint has resolved an administrator.
 */
export async function createLocalAccountAsAdministrator(
  accounts: LocalAccountStore,
  request: AdministratorAuthorizedAccountRequest,
): Promise<LocalAxeonAccount> {
  const status = await inspectAdministratorAuthorization(accounts, request.administratorUsername, request.administratorPassword);
  if (status !== 'verified') throw new LocalAccountCreationAuthorizationError(status);
  return accounts.create(request.username, request.password, request.role);
}
