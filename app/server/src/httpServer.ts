import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import type { AxeonServerConfiguration } from './config.js';
import { createLocalAccountStore } from './localAccountStore.js';
import { createLocalAuthenticationProvider, type AxeonAuthenticationProvider } from './localAuthentication.js';
import type { ObjectProfileRegistry } from './objectProfileRegistry.js';
import { requireAdministrator } from './authentication.js';
import { clearSessionCookie, createSessionManager, csrfTokenMatches, parseSessionCookie, sessionCookie, type SessionManager } from './sessions.js';
import { createSyntheticSqliteWorkOrderRepository, SyntheticDatabaseError, type WorkOrderInvestigationDataPort } from './syntheticDatabase.js';

export interface AxeonAuthenticationRuntime { readonly provider: AxeonAuthenticationProvider; readonly sessions: SessionManager; }
export interface AxeonHttpServerOptions { readonly configuration: AxeonServerConfiguration; readonly objectProfiles: ObjectProfileRegistry; readonly authentication?: AxeonAuthenticationRuntime; readonly workOrderData?: WorkOrderInvestigationDataPort | null; }

const contentTypes: Readonly<Record<string, string>> = Object.freeze({
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
});

function securityHeaders(response: ServerResponse): void {
  response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('X-Frame-Options', 'SAMEORIGIN'); response.setHeader('Referrer-Policy', 'same-origin'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}
function sendJson(response: ServerResponse, status: number, payload: unknown, headers: Readonly<Record<string, string>> = {}): void {
  securityHeaders(response); for (const [name, value] of Object.entries(headers)) response.setHeader(name, value); response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(payload));
}
function sendError(response: ServerResponse, status: number, code: string, message: string): void { sendJson(response, status, { error: { code, message } }); }

function safeStaticPath(root: string, pathname: string): string | null {
  let decoded: string; try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const requested = resolve(root, `.${decoded}`); const pathRelative = relative(root, requested);
  return pathRelative.startsWith('..') || pathRelative.includes(':') ? null : requested;
}
async function serveStatic(response: ServerResponse, root: string, pathname: string): Promise<void> {
  const requested = safeStaticPath(root, pathname === '/' ? '/index.html' : pathname);
  if (!requested) return sendError(response, 400, 'invalid-path', 'The requested path is invalid.');
  try { const file = await readFile(requested); securityHeaders(response); response.writeHead(200, { 'Content-Type': contentTypes[extname(requested)] ?? 'application/octet-stream' }); response.end(file); }
  catch {
    if (extname(pathname)) return sendError(response, 404, 'not-found', 'The requested resource was not found.');
    try { const index = await readFile(resolve(root, 'index.html')); securityHeaders(response); response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(index); }
    catch { sendError(response, 503, 'application-unavailable', 'The Axeon application build is unavailable.'); }
  }
}
function requestExceedsLimit(request: IncomingMessage, limit: number): boolean { const length = Number(request.headers['content-length'] ?? '0'); return Number.isFinite(length) && length > limit; }
class HttpRequestError extends Error { constructor(readonly status: number, readonly code: string, readonly safeMessage: string) { super(safeMessage); } }
async function readJson(request: IncomingMessage, limit: number): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of request) { body += String(chunk); if (Buffer.byteLength(body) > limit) throw new HttpRequestError(413, 'request-too-large', 'The request exceeds the allowed size.'); }
  try { const parsed: unknown = JSON.parse(body); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed as Record<string, unknown>; }
  catch { throw new HttpRequestError(400, 'invalid-request', 'The request is invalid.'); }
}
function stringValue(body: Record<string, unknown>, name: string): string | null { const value = body[name]; return typeof value === 'string' && value.length <= 256 ? value : null; }
function sessionFrom(request: IncomingMessage, runtime: AxeonAuthenticationRuntime) { return runtime.sessions.resolve(parseSessionCookie(request.headers.cookie)); }

export function createDefaultAuthenticationRuntime(configuration: AxeonServerConfiguration): AxeonAuthenticationRuntime {
  return Object.freeze({ provider: createLocalAuthenticationProvider(createLocalAccountStore(configuration.accountStorePath)), sessions: createSessionManager(configuration.session) });
}
export function createConfiguredWorkOrderData(configuration: AxeonServerConfiguration): WorkOrderInvestigationDataPort | null {
  return configuration.syntheticDatabase.enabled ? createSyntheticSqliteWorkOrderRepository(configuration.syntheticDatabase.filePath) : null;
}
export function createAxeonHttpServer(options: AxeonHttpServerOptions): Server {
  const authentication = options.authentication ?? createDefaultAuthenticationRuntime(options.configuration);
  const workOrderData = options.workOrderData ?? createConfiguredWorkOrderData(options.configuration);
  return createServer((request, response) => { void handleRequest(request, response, options.configuration, authentication, workOrderData); });
}
async function handleRequest(request: IncomingMessage, response: ServerResponse, configuration: AxeonServerConfiguration, authentication: AxeonAuthenticationRuntime, workOrderData: WorkOrderInvestigationDataPort | null): Promise<void> {
  try {
    const url = new URL(request.url ?? '/', 'http://axeon.local'); const pathname = url.pathname;
    if (requestExceedsLimit(request, configuration.maxRequestBodyBytes)) return sendError(response, 413, 'request-too-large', 'The request exceeds the allowed size.');
    if (request.method === 'GET' && pathname === '/api/v1/health') return sendJson(response, 200, { status: 'ok', apiVersion: 'v1', service: 'axeon-map' });
    if (request.method === 'GET' && pathname === '/api/v1/session') {
      const result = sessionFrom(request, authentication);
      if (result.status === 'active') return sendJson(response, 200, { principal: result.session.principal, csrfToken: result.session.csrfToken });
      return sendError(response, 401, result.status === 'expired' ? 'session-expired' : 'unauthenticated', result.status === 'expired' ? 'Your session has expired. Please sign in again.' : 'Authentication is required.');
    }
    if (request.method === 'POST' && pathname === '/api/v1/auth/login') {
      const body = await readJson(request, configuration.maxRequestBodyBytes); const username = stringValue(body, 'username'); const password = stringValue(body, 'password');
      if (!username || !password) return sendError(response, 401, 'authentication-failed', 'The username or password is incorrect.');
      const result = await authentication.provider.authenticate({ username, password, remoteAddress: request.socket.remoteAddress ?? 'unknown' });
      if (result.status !== 'authenticated') return sendError(response, 401, 'authentication-failed', 'The username or password is incorrect.');
      authentication.sessions.destroy(parseSessionCookie(request.headers.cookie)); const session = authentication.sessions.create(result.principal);
      return sendJson(response, 200, { principal: session.principal, csrfToken: session.csrfToken }, { 'Set-Cookie': sessionCookie(session.id, configuration.session.maxLifetimeMs, configuration.session.secureCookies) });
    }
    if (request.method === 'POST' && pathname === '/api/v1/auth/logout') {
      const result = sessionFrom(request, authentication);
      if (result.status !== 'active') return sendError(response, 401, 'unauthenticated', 'Authentication is required.');
      const csrfHeader = request.headers['x-csrf-token'];
      if (!csrfTokenMatches(result.session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) return sendError(response, 403, 'csrf-rejected', 'The request could not be verified.');
      authentication.sessions.destroy(result.session.id); return sendJson(response, 204, undefined, { 'Set-Cookie': clearSessionCookie(configuration.session.secureCookies) });
    }
    if (request.method === 'GET' && pathname === '/api/v1/work-orders/site-aggregate') {
      const result = sessionFrom(request, authentication); if (result.status !== 'active') return sendError(response, 401, 'unauthenticated', 'Authentication is required.');
      if (!workOrderData) return sendError(response, 503, 'data-unavailable', 'The configured data source is unavailable.');
      const aggregate = workOrderData.aggregateBySite(result.session.principal);
      return sendJson(response, 200, { totalCount: aggregate.totalCount, groups: aggregate.groups });
    }
    if (request.method === 'GET' && pathname === '/api/v1/work-orders/preview') {
      const result = sessionFrom(request, authentication); if (result.status !== 'active') return sendError(response, 401, 'unauthenticated', 'Authentication is required.');
      if (!workOrderData) return sendError(response, 503, 'data-unavailable', 'The configured data source is unavailable.');
      const offsetText = url.searchParams.get('offset') ?? '0'; const offset = Number(offsetText); const site = url.searchParams.get('site') ?? undefined;
      const preview = workOrderData.previewWorkOrders(result.session.principal, { site, offset });
      return sendJson(response, 200, { totalCount: preview.totalCount, records: preview.records, limit: 20, offset });
    }
    /* Account management is deliberately absent; this endpoint proves future operations are role-gated server-side. */
    if (pathname === '/api/v1/admin/accounts') {
      const result = sessionFrom(request, authentication);
      if (result.status !== 'active') return sendError(response, 401, 'unauthenticated', 'Authentication is required.');
      try { requireAdministrator(result.session.principal); } catch { return sendError(response, 403, 'forbidden', 'The current user is not authorized for this operation.'); }
      return sendError(response, 501, 'not-implemented', 'Account management is not available in this release.');
    }
    if (pathname.startsWith('/api/')) return sendError(response, 404, 'not-found', 'No protected data API is available in this release.');
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendError(response, 405, 'method-not-allowed', 'Only read-only browser routes are available.');
    await serveStatic(response, configuration.staticDirectory, pathname);
  } catch (error) {
    if (error instanceof HttpRequestError) return sendError(response, error.status, error.code, error.safeMessage);
    if (error instanceof SyntheticDatabaseError) return sendError(response, error.code === 'unauthorized' ? 403 : error.code === 'invalid-request' ? 400 : 503, error.code === 'invalid-request' ? 'invalid-request' : error.code === 'unauthorized' ? 'forbidden' : 'data-unavailable', error.code === 'unauthorized' ? 'The current user is not authorized for this operation.' : error.code === 'invalid-request' ? 'The request is invalid.' : 'The configured data source is unavailable.');
    return sendError(response, 500, 'server-error', 'Axeon could not complete this request.');
  }
}
export async function listenAxeonHttpServer(server: Server, configuration: Pick<AxeonServerConfiguration, 'host' | 'port'>): Promise<void> { await new Promise<void>((resolveListening, rejectListening) => { server.once('error', rejectListening); server.listen(configuration.port, configuration.host, () => { server.removeListener('error', rejectListening); resolveListening(); }); }); }
export async function closeAxeonHttpServer(server: Server): Promise<void> { await new Promise<void>((resolveClosing, rejectClosing) => server.close((error) => error ? rejectClosing(error) : resolveClosing())); }
