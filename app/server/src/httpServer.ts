import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import type { AxeonServerConfiguration } from './config.js';
import type { ObjectProfileRegistry } from './objectProfileRegistry.js';

export interface AxeonHttpServerOptions {
  readonly configuration: AxeonServerConfiguration;
  readonly objectProfiles: ObjectProfileRegistry;
}

const contentTypes: Readonly<Record<string, string>> = Object.freeze({
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
});

function securityHeaders(response: ServerResponse): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Cache-Control', 'no-store');
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  securityHeaders(response);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  sendJson(response, status, { error: { code, message } });
}

function safeStaticPath(root: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const requested = resolve(root, `.${decoded}`);
  const pathRelative = relative(root, requested);
  return pathRelative.startsWith('..') || pathRelative.includes(':') ? null : requested;
}

async function serveStatic(response: ServerResponse, root: string, pathname: string): Promise<void> {
  const requested = safeStaticPath(root, pathname === '/' ? '/index.html' : pathname);
  if (!requested) return sendError(response, 400, 'invalid-path', 'The requested path is invalid.');
  try {
    const file = await readFile(requested);
    securityHeaders(response);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(requested)] ?? 'application/octet-stream' });
    response.end(file);
  } catch {
    if (extname(pathname)) return sendError(response, 404, 'not-found', 'The requested resource was not found.');
    try {
      const index = await readFile(resolve(root, 'index.html'));
      securityHeaders(response);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(index);
    } catch {
      sendError(response, 503, 'application-unavailable', 'The Axeon application build is unavailable.');
    }
  }
}

function requestExceedsLimit(request: IncomingMessage, limit: number): boolean {
  const declaredLength = Number(request.headers['content-length'] ?? '0');
  return Number.isFinite(declaredLength) && declaredLength > limit;
}

export function createAxeonHttpServer(options: AxeonHttpServerOptions): Server {
  return createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://axeon.local').pathname;
    if (requestExceedsLimit(request, options.configuration.maxRequestBodyBytes)) {
      sendError(response, 413, 'request-too-large', 'The request exceeds the allowed size.');
      return;
    }
    if (request.method === 'GET' && pathname === '/api/v1/health') {
      sendJson(response, 200, { status: 'ok', apiVersion: 'v1', service: 'axeon-map' });
      return;
    }
    if (pathname.startsWith('/api/')) {
      sendError(response, 404, 'not-found', 'No data API is available until authentication is implemented.');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendError(response, 405, 'method-not-allowed', 'Only read-only browser routes are available.');
      return;
    }
    void serveStatic(response, options.configuration.staticDirectory, pathname);
  });
}

export async function listenAxeonHttpServer(server: Server, configuration: Pick<AxeonServerConfiguration, 'host' | 'port'>): Promise<void> {
  await new Promise<void>((resolveListening, rejectListening) => {
    server.once('error', rejectListening);
    server.listen(configuration.port, configuration.host, () => {
      server.removeListener('error', rejectListening);
      resolveListening();
    });
  });
}

export async function closeAxeonHttpServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClosing, rejectClosing) => server.close((error) => error ? rejectClosing(error) : resolveClosing()));
}
