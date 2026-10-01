// @vitest-environment node
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalAccountStore } from './localAccountStore.js';
import { loadServerConfiguration } from './config.js';
import { closeAxeonHttpServer, createAxeonHttpServer, listenAxeonHttpServer } from './httpServer.js';
import { DEFAULT_OBJECT_PROFILE_REGISTRY } from './objectProfileRegistry.js';

const servers: Server[] = [];
const directories: string[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => closeAxeonHttpServer(server))); await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

async function startServer() {
  const configuration = { ...loadServerConfiguration({ NODE_ENV: 'test' }), host: '127.0.0.1', port: 0 };
  const server = createAxeonHttpServer({ configuration, objectProfiles: DEFAULT_OBJECT_PROFILE_REGISTRY });
  servers.push(server);
  await listenAxeonHttpServer(server, configuration);
  return (server.address() as AddressInfo).port;
}

function send(port: number, path: string, method = 'GET', headers: Record<string, string> = {}, body?: string): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolveResponse, rejectResponse) => {
    const responseRequest = request({ host: '127.0.0.1', port, path, method, headers }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => resolveResponse({ status: response.statusCode ?? 0, body, headers: response.headers }));
    });
    responseRequest.on('error', rejectResponse);
    responseRequest.end(body);
  });
}
const get = (port: number, path: string, headers: Record<string, string> = {}) => send(port, path, 'GET', headers);

test('versioned health endpoint is public and exposes no configuration', async () => {
  const response = await get(await startServer(), '/api/v1/health');
  expect(response.status).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ status: 'ok', apiVersion: 'v1', service: 'axeon-map' });
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.body).not.toMatch(/database|credential|secret|maximo/i);
});

test('no data API is exposed before authentication and oversized requests are rejected', async () => {
  const port = await startServer();
  const absentDataApi = await get(port, '/api/v1/data/work-orders');
  expect(absentDataApi.status).toBe(404);
  expect(absentDataApi.body).toContain('No protected data API');
  const oversized = await get(port, '/api/v1/health', { 'content-length': '20000' });
  expect(oversized.status).toBe(413);
});

test('local login creates a protected session, rejects CSRF omission, and logout invalidates it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'axeon-server-auth-')); directories.push(directory);
  const configuration = { ...loadServerConfiguration({ NODE_ENV: 'test', AXEON_ACCOUNT_STORE_PATH: join(directory, 'accounts.json') }), host: '127.0.0.1', port: 0 };
  const accounts = createLocalAccountStore(configuration.accountStorePath);
  await accounts.bootstrapAdministrator('axeon.admin', 'A-strong-local-password');
  await accounts.create('axeon.user', 'A-strong-local-user-password', 'user');
  const server = createAxeonHttpServer({ configuration, objectProfiles: DEFAULT_OBJECT_PROFILE_REGISTRY }); servers.push(server); await listenAxeonHttpServer(server, configuration);
  const port = (server.address() as AddressInfo).port;
  const wrong = await send(port, '/api/v1/auth/login', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ username: 'axeon.admin', password: 'wrong-password' }));
  expect(wrong).toMatchObject({ status: 401 }); expect(wrong.body).toContain('username or password is incorrect');
  const login = await send(port, '/api/v1/auth/login', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ username: 'axeon.admin', password: 'A-strong-local-password' }));
  expect(login.status).toBe(200); const session = JSON.parse(login.body) as { csrfToken: string; principal: { role: string } }; expect(session.principal.role).toBe('administrator');
  const cookie = String(login.headers['set-cookie']); expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict');
  expect((await get(port, '/api/v1/session', { cookie })).status).toBe(200);
  const userLogin = await send(port, '/api/v1/auth/login', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ username: 'axeon.user', password: 'A-strong-local-user-password' }));
  const userCookie = String(userLogin.headers['set-cookie']);
  expect((await get(port, '/api/v1/admin/accounts', { cookie: userCookie })).status).toBe(403);
  expect((await get(port, '/api/v1/admin/accounts', { cookie })).status).toBe(501);
  expect((await send(port, '/api/v1/auth/logout', 'POST', { cookie })).status).toBe(403);
  const logout = await send(port, '/api/v1/auth/logout', 'POST', { cookie, 'x-csrf-token': session.csrfToken }); expect(logout.status).toBe(204); expect(String(logout.headers['set-cookie'])).toContain('Max-Age=0');
  expect((await get(port, '/api/v1/session', { cookie })).status).toBe(401);
});
