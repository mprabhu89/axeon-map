import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AxeonRole } from './authentication.js';
import { hashPassword } from './passwords.js';

export interface LocalAxeonAccount {
  readonly id: string;
  readonly username: string;
  readonly role: AxeonRole;
  readonly passwordHash: string;
  readonly createdAt: string;
}

interface AccountFile {
  readonly schemaVersion: 1;
  readonly accounts: readonly LocalAxeonAccount[];
}

export interface LocalAccountStore {
  list(): Promise<readonly LocalAxeonAccount[]>;
  findByUsername(username: string): Promise<LocalAxeonAccount | null>;
  bootstrapAdministrator(username: string, password: string): Promise<LocalAxeonAccount>;
  create(username: string, password: string, role: AxeonRole): Promise<LocalAxeonAccount>;
}

export function normalizeUsername(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalized)) throw new Error('Axeon usernames must use 3 to 64 lowercase letters, numbers, dots, underscores, or hyphens.');
  return normalized;
}

export function createLocalAccountStore(filePath: string): LocalAccountStore {
  const read = async (): Promise<AccountFile> => {
    try {
      const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
      if (!isAccountFile(parsed)) throw new Error('The local Axeon account store is invalid.');
      return parsed;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, accounts: [] };
      throw error;
    }
  };
  const write = async (accounts: readonly LocalAxeonAccount[]): Promise<void> => {
    await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
    const temporary = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify({ schemaVersion: 1, accounts }), { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, filePath);
  };
  const create = async (usernameValue: string, password: string, role: AxeonRole): Promise<LocalAxeonAccount> => {
    const username = normalizeUsername(usernameValue);
    const current = await read();
    if (current.accounts.some((account) => account.username === username)) throw new Error('An Axeon account with this username already exists.');
    const account: LocalAxeonAccount = Object.freeze({ id: randomUUID(), username, role, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() });
    await write([...current.accounts, account]);
    return account;
  };
  return Object.freeze({
    async list() { return (await read()).accounts; },
    async findByUsername(username: string) { return (await read()).accounts.find((account) => account.username === normalizeUsername(username)) ?? null; },
    create,
    async bootstrapAdministrator(username: string, password: string) {
      if ((await read()).accounts.length > 0) throw new Error('Initial administrator bootstrap is unavailable because local Axeon accounts already exist.');
      return create(username, password, 'administrator');
    },
  });
}

function isAccountFile(value: unknown): value is AccountFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { schemaVersion?: unknown; accounts?: unknown };
  return candidate.schemaVersion === 1 && Array.isArray(candidate.accounts) && candidate.accounts.every((account) => {
    const item = account as Partial<LocalAxeonAccount>;
    return typeof item.id === 'string' && typeof item.username === 'string' && (item.role === 'administrator' || item.role === 'user') && typeof item.passwordHash === 'string' && typeof item.createdAt === 'string';
  });
}
