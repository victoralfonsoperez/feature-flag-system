import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockLoginWithRedirect = vi.fn();
const mockLogout = vi.fn();
const mockGetAccessTokenSilently = vi.fn().mockResolvedValue('test-token');

let mockAuth0State = {
  user: undefined as Record<string, unknown> | undefined,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    ...mockAuth0State,
    loginWithRedirect: mockLoginWithRedirect,
    logout: mockLogout,
    getAccessTokenSilently: mockGetAccessTokenSilently,
  }),
}));

vi.mock('../api', () => ({
  setAccessTokenGetter: vi.fn(),
}));

afterEach(() => {
  cleanup();
  mockAuth0State = {
    user: undefined,
    isAuthenticated: false,
    isLoading: false,
  };
});

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="role">{user ? user.role : 'none'}</span>
      <button onClick={() => login()}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  it('shows loading state', () => {
    mockAuth0State = { user: undefined, isAuthenticated: false, isLoading: true };
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('shows unauthenticated state', () => {
    mockAuth0State = { user: undefined, isAuthenticated: false, isLoading: false };
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('shows authenticated user with admin role', () => {
    mockAuth0State = {
      user: {
        sub: 'auth0|123',
        email: 'admin@test.com',
        'https://kanary.dev/roles': ['admin'],
      },
      isAuthenticated: true,
      isLoading: false,
    };
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('admin@test.com');
    expect(screen.getByTestId('role').textContent).toBe('admin');
  });

  it('defaults to viewer role when no admin role', () => {
    mockAuth0State = {
      user: {
        sub: 'auth0|456',
        email: 'viewer@test.com',
        'https://kanary.dev/roles': ['viewer'],
      },
      isAuthenticated: true,
      isLoading: false,
    };
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('role').textContent).toBe('viewer');
  });

  it('calls loginWithRedirect on login', async () => {
    mockAuth0State = { user: undefined, isAuthenticated: false, isLoading: false };
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(mockLoginWithRedirect).toHaveBeenCalled();
    });
  });

  it('calls auth0 logout on logout', async () => {
    mockAuth0State = {
      user: { sub: 'auth0|123', email: 'user@test.com' },
      isAuthenticated: true,
      isLoading: false,
    };
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledWith({
        logoutParams: { returnTo: window.location.origin },
      });
    });
  });

  it('throws if useAuth is used outside AuthProvider', () => {
    function BadConsumer() {
      useAuth();
      return null;
    }
    expect(() => render(<BadConsumer />)).toThrow('useAuth must be used within AuthProvider');
  });
});
