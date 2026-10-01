export type AxeonRole = 'administrator' | 'user';
export interface BrowserPrincipal { readonly subjectId: string; readonly username: string; readonly role: AxeonRole; readonly authenticationMethod: 'password-session' | 'sso' | 'service'; readonly issuedAt: string; }
export interface BrowserSession { readonly principal: BrowserPrincipal; readonly csrfToken: string; }
export class AuthenticationApiError extends Error { constructor(readonly code: string, message: string) { super(message); } }

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try { return await fetch(path, { credentials: 'same-origin', ...init }); }
  catch { throw new AuthenticationApiError('unavailable', 'The local Axeon authentication service is unavailable.'); }
}
async function responseError(response: Response): Promise<AuthenticationApiError> {
  try {
    const body = await response.json() as { error?: { code?: string; message?: string } };
    return new AuthenticationApiError(body.error?.code ?? 'authentication-failed', body.error?.message ?? 'Authentication is unavailable.');
  } catch { return new AuthenticationApiError('authentication-failed', 'Authentication is unavailable.'); }
}
export async function getCurrentSession(): Promise<BrowserSession> {
  const response = await request('/api/v1/session');
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<BrowserSession>;
}
export async function signIn(username: string, password: string): Promise<BrowserSession> {
  const response = await request('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<BrowserSession>;
}
export async function signOut(csrfToken: string): Promise<void> {
  const response = await request('/api/v1/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
  if (!response.ok) throw await responseError(response);
}
