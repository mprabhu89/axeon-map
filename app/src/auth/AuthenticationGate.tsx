import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { AuthenticationApiError, getCurrentSession, signIn, signOut, type BrowserSession } from './authApi';

type GateState = Readonly<{ kind: 'checking' }> | Readonly<{ kind: 'signed-out'; message: string | null }> | Readonly<{ kind: 'signed-in'; session: BrowserSession }>;

function LoginPage({ message, onLogin }: { readonly message: string | null; readonly onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(message); const [busy, setBusy] = useState(false);
  useEffect(() => { setError(message); }, [message]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    if (!username.trim() || !password) { setError('Enter your Axeon username and password.'); return; }
    setBusy(true);
    try { await onLogin(username, password); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Authentication is unavailable.'); } finally { setBusy(false); }
  };
  return <main className="authentication-screen" aria-labelledby="axeon-login-title"><section className="authentication-card"><div className="authentication-brand"><span className="brand-mark">A</span><div><strong>AXEON MAP</strong><small>WORK MANAGEMENT INTELLIGENCE</small></div></div><p className="authentication-eyebrow">SECURE LOCAL ACCESS</p><h1 id="axeon-login-title">Sign in to Axeon Map</h1><p className="authentication-copy">Use an administrator-created local Axeon account to continue.</p><form onSubmit={submit} className="authentication-form"><label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={busy} /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label>{error && <p role="alert" className="authentication-error">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><p className="authentication-note">Local development authentication only. Axeon login does not grant Maximo data authorization.</p></section></main>;
}

export function AuthenticationGate({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'checking' });
  useEffect(() => { void getCurrentSession().then((session) => setState({ kind: 'signed-in', session })).catch((error: unknown) => {
    const apiError = error instanceof AuthenticationApiError ? error : null;
    setState({ kind: 'signed-out', message: apiError?.code === 'session-expired' ? 'Your session has expired. Please sign in again.' : apiError?.code === 'unavailable' ? apiError.message : null });
  }); }, []);
  const login = async (username: string, password: string) => { const session = await signIn(username.trim(), password); setState({ kind: 'signed-in', session }); };
  const logout = async () => {
    if (state.kind !== 'signed-in') return;
    try { await signOut(state.session.csrfToken); } finally { setState({ kind: 'signed-out', message: null }); }
  };
  if (state.kind === 'checking') return <main className="authentication-screen"><p className="authentication-loading">Checking secure local session…</p></main>;
  if (state.kind === 'signed-out') return <LoginPage message={state.message} onLogin={login} />;
  return <><button className="authentication-logout" type="button" onClick={() => { void logout(); }} aria-label="Sign out of Axeon Map">Sign out</button>{children}</>;
}
