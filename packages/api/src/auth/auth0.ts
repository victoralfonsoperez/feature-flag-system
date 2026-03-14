import * as jose from 'jose';

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof jose.createRemoteJWKSet> {
  if (!jwks) {
    const domain = process.env.AUTH0_DOMAIN;
    if (!domain) throw new Error('AUTH0_DOMAIN environment variable is required');
    jwks = jose.createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  }
  return jwks;
}

export type Auth0Claims = {
  sub: string;
  email: string;
  roles: string[];
};

const ROLES_NAMESPACE = 'https://kanary.dev/roles';

export async function verifyAuth0Token(token: string): Promise<Auth0Claims | null> {
  try {
    const audience = process.env.AUTH0_AUDIENCE;
    if (!audience) throw new Error('AUTH0_AUDIENCE environment variable is required');

    const domain = process.env.AUTH0_DOMAIN;
    if (!domain) throw new Error('AUTH0_DOMAIN environment variable is required');

    const { payload } = await jose.jwtVerify(token, getJWKS(), {
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
    });

    const sub = payload.sub;
    const email = (payload.email as string) || (payload[`${ROLES_NAMESPACE.replace('/roles', '')}/email`] as string) || '';
    const roles = (payload[ROLES_NAMESPACE] as string[]) || [];

    if (!sub) return null;

    return { sub, email, roles };
  } catch {
    return null;
  }
}

/** Reset cached JWKS (for testing). */
export function resetJWKS(): void {
  jwks = null;
}
