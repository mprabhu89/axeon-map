// @vitest-environment node
import { expect, test } from 'vitest';
import { ProtectedRouteError, requireAuthenticatedPrincipal } from './authentication.js';

test('protected API contract fails closed when no authenticated principal exists', () => {
  expect(() => requireAuthenticatedPrincipal(null)).toThrow(ProtectedRouteError);
  try {
    requireAuthenticatedPrincipal(undefined);
  } catch (error) {
    expect(error).toMatchObject({ code: 'unauthenticated' });
  }
});
