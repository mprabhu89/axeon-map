import type { AuthenticatedPrincipal } from './authentication.js';
import type { LocalAccountStore } from './localAccountStore.js';
import { normalizeUsername } from './localAccountStore.js';
import { verifyPassword } from './passwords.js';

export interface AuthenticationAttempt {
  readonly username: string;
  readonly password: string;
  readonly remoteAddress: string;
}

export type AuthenticationResult =
  | Readonly<{ status: 'authenticated'; principal: AuthenticatedPrincipal }>
  | Readonly<{ status: 'invalid-credentials' | 'throttled' }>;

/** Provider-independent port: future OIDC/SAML providers map into the same result contract. */
export interface AxeonAuthenticationProvider {
  authenticate(attempt: AuthenticationAttempt): Promise<AuthenticationResult>;
}

export class LoginThrottle {
  private readonly attempts = new Map<string, { count: number; firstFailureAt: number; blockedUntil: number }>();
  constructor(private readonly now: () => number = Date.now, private readonly maximumFailures = 5, private readonly windowMs = 5 * 60 * 1000, private readonly blockMs = 10 * 60 * 1000) {}
  isBlocked(key: string): boolean {
    const entry = this.attempts.get(key);
    return !!entry && entry.blockedUntil > this.now();
  }
  recordFailure(key: string): void {
    const timestamp = this.now();
    const previous = this.attempts.get(key);
    const entry = !previous || timestamp - previous.firstFailureAt > this.windowMs ? { count: 1, firstFailureAt: timestamp, blockedUntil: 0 } : { ...previous, count: previous.count + 1 };
    if (entry.count >= this.maximumFailures) entry.blockedUntil = timestamp + this.blockMs;
    this.attempts.set(key, entry);
  }
  clear(key: string): void { this.attempts.delete(key); }
}

export function createLocalAuthenticationProvider(accounts: LocalAccountStore, throttle = new LoginThrottle(), now: () => number = Date.now): AxeonAuthenticationProvider {
  return Object.freeze({
    async authenticate(attempt: AuthenticationAttempt): Promise<AuthenticationResult> {
      let username: string;
      try { username = normalizeUsername(attempt.username); } catch { return { status: 'invalid-credentials' }; }
      const key = `${attempt.remoteAddress}:${username}`;
      if (throttle.isBlocked(key)) return { status: 'throttled' };
      const account = await accounts.findByUsername(username);
      const matches = account ? await verifyPassword(attempt.password, account.passwordHash) : false;
      if (!account || !matches) {
        throttle.recordFailure(key);
        return { status: throttle.isBlocked(key) ? 'throttled' : 'invalid-credentials' };
      }
      throttle.clear(key);
      return { status: 'authenticated', principal: Object.freeze({ subjectId: account.id, username: account.username, role: account.role, authenticationMethod: 'password-session', issuedAt: new Date(now()).toISOString() }) };
    },
  });
}
