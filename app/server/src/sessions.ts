import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthenticatedPrincipal } from './authentication.js';

export interface ServerSession {
  readonly id: string;
  readonly principal: AuthenticatedPrincipal;
  readonly csrfToken: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly lastActivityAt: number;
}
export type SessionResolution = Readonly<{ status: 'active'; session: ServerSession }> | Readonly<{ status: 'missing' | 'expired' }>;
export interface SessionManager { create(principal: AuthenticatedPrincipal): ServerSession; resolve(id: string | null): SessionResolution; destroy(id: string | null): void; }

export function createSessionManager(options: { readonly maxLifetimeMs: number; readonly inactivityTimeoutMs: number; readonly now?: () => number }): SessionManager {
  const now = options.now ?? Date.now;
  const sessions = new Map<string, ServerSession>();
  const token = () => randomBytes(32).toString('base64url');
  return Object.freeze({
    create(principal: AuthenticatedPrincipal): ServerSession {
      const timestamp = now();
      const session: ServerSession = Object.freeze({ id: token(), principal, csrfToken: token(), createdAt: timestamp, expiresAt: timestamp + options.maxLifetimeMs, lastActivityAt: timestamp });
      sessions.set(session.id, session);
      return session;
    },
    resolve(id: string | null): SessionResolution {
      if (!id) return { status: 'missing' };
      const session = sessions.get(id);
      if (!session) return { status: 'missing' };
      if (session.expiresAt <= now() || session.lastActivityAt + options.inactivityTimeoutMs <= now()) {
        sessions.delete(id);
        return { status: 'expired' };
      }
      const refreshed = Object.freeze({ ...session, lastActivityAt: now() });
      sessions.set(id, refreshed);
      return { status: 'active', session: refreshed };
    },
    destroy(id: string | null): void { if (id) sessions.delete(id); },
  });
}

export function csrfTokenMatches(session: ServerSession, supplied: string | undefined): boolean {
  if (!supplied) return false;
  const expected = Buffer.from(session.csrfToken);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function parseSessionCookie(header: string | undefined): string | null {
  const cookie = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith('axeon_session='));
  return cookie ? decodeURIComponent(cookie.slice('axeon_session='.length)) : null;
}

export function sessionCookie(id: string, maxLifetimeMs: number, secure: boolean): string {
  return `axeon_session=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(maxLifetimeMs / 1000)}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `axeon_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}
