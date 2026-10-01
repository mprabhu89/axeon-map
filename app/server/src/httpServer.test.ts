// @vitest-environment node
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, test } from 'vitest';
import { loadServerConfiguration } from './config.js';
import { closeAxeonHttpServer, createAxeonHttpServer, listenAxeonHttpServer } from './httpServer.js';
import { DEFAULT_OBJECT_PROFILE_REGISTRY } from './objectProfileRegistry.js';

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => closeAxeonHttpServer(server))); });

async function startServer() {
  const configuration = { ...loadServerConfiguration({ NODE_ENV: 'test' }), host: '127.0.0.1', port: 0 };
  const server = createAxeonHttpServer({ configuration, objectProfiles: DEFAULT_OBJECT_PROFILE_REGISTRY });
  servers.push(server);
  await listenAxeonHttpServer(server, configuration);
  return (server.address() as AddressInfo).port;
}

function get(port: number, path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolveResponse, rejectResponse) => {
    const responseRequest = request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => resolveResponse({ status: response.statusCode ?? 0, body, headers: response.headers }));
    });
    responseRequest.on('error', rejectResponse);
    responseRequest.end();
  });
}

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
  expect(absentDataApi.body).toContain('authentication is implemented');
  const oversized = await get(port, '/api/v1/health', { 'content-length': '20000' });
  expect(oversized.status).toBe(413);
});
