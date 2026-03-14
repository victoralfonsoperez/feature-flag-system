import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Header from './Header';

const mockLogout = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'auth0|123', email: 'test@example.com', role: 'admin' },
    logout: mockLogout,
    auth0Domain: 'test.us.auth0.com',
    auth0ClientId: 'test-client-id',
  }),
}));

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const defaultProps = {
  environment: 'production' as const,
  onEnvironmentChange: vi.fn(),
  appId: 'default',
  onAppIdChange: vi.fn(),
  view: 'flags' as const,
  onViewChange: vi.fn(),
};

beforeEach(() => {
  mockLogout.mockReset();
  mockShowToast.mockReset();
  vi.restoreAllMocks();
});

afterEach(cleanup);

describe('Header', () => {
  it('renders the Change Password button', () => {
    render(<Header {...defaultProps} />);
    const buttons = screen.getAllByText('Change Password');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('sends password reset request on click and shows success toast', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('OK', { status: 200 }),
    );

    render(<Header {...defaultProps} />);
    const buttons = screen.getAllByText('Change Password');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test.us.auth0.com/dbconnections/change_password',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'test-client-id',
            email: 'test@example.com',
            connection: 'Username-Password-Authentication',
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Password reset email sent. Check your inbox.',
        'success',
      );
    });
  });

  it('shows error toast when password reset request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Error', { status: 500 }),
    );

    render(<Header {...defaultProps} />);
    const buttons = screen.getAllByText('Change Password');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Failed to send password reset email.',
        'error',
      );
    });
  });

  it('shows error toast on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<Header {...defaultProps} />);
    const buttons = screen.getAllByText('Change Password');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Failed to send password reset email.',
        'error',
      );
    });
  });
});
