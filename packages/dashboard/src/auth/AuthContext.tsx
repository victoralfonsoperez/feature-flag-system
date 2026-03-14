import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setAccessTokenGetter } from '../api';

const ROLES_NAMESPACE = 'https://kanary.dev/roles';

type User = { id: string; email: string; role: string };

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  auth0Domain: string;
  auth0ClientId: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};
const auth0Domain = env.VITE_AUTH0_DOMAIN || '';
const auth0ClientId = env.VITE_AUTH0_CLIENT_ID || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  // Wire up the token getter for api.ts
  useEffect(() => {
    if (isAuthenticated) {
      setAccessTokenGetter(() => getAccessTokenSilently());
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  const user: User | null = isAuthenticated && auth0User
    ? {
        id: auth0User.sub || '',
        email: auth0User.email || '',
        role: ((auth0User[ROLES_NAMESPACE] as string[]) || []).includes('admin') ? 'admin' : 'viewer',
      }
    : null;

  const login = () => { loginWithRedirect(); };
  const logout = () => { auth0Logout({ logoutParams: { returnTo: window.location.origin } }); };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, auth0Domain, auth0ClientId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
