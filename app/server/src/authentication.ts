export interface AuthenticatedPrincipal {
  readonly subjectId: string;
  readonly authenticationMethod: 'password-session' | 'sso' | 'service';
  readonly issuedAt: string;
}

export interface AuthorizationContext {
  readonly principal: AuthenticatedPrincipal;
  readonly objectProfileId: string;
  readonly operation: 'explore' | 'filter' | 'preview-records' | 'export-records' | 'analytics' | 'report' | 'ai-question';
}

export interface AuthorizationDecision {
  readonly permitted: boolean;
  readonly reason: 'permitted' | 'unauthenticated' | 'forbidden' | 'unsupported';
}

export interface AuthorizationService {
  authorize(context: AuthorizationContext): Promise<AuthorizationDecision>;
}

export class ProtectedRouteError extends Error {
  constructor(readonly code: 'unauthenticated' | 'forbidden') {
    super(code === 'unauthenticated' ? 'Authentication is required for this API.' : 'The current user is not authorized for this API.');
  }
}

/** Future data routes must call this before object resolution or adapter execution. */
export function requireAuthenticatedPrincipal(principal: AuthenticatedPrincipal | null | undefined): AuthenticatedPrincipal {
  if (!principal) throw new ProtectedRouteError('unauthenticated');
  return principal;
}
