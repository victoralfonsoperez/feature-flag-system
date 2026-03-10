import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import UserManager from './UserManager';

const mockUsers = [
  { id: 1, email: 'admin@test.com', role: 'admin' as const, created_at: '2026-01-01' },
  { id: 2, email: 'viewer@test.com', role: 'viewer' as const, created_at: '2026-01-02' },
];

const mockGetUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('../api', () => ({
  getUsers: (...args: unknown[]) => mockGetUsers(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@test.com', role: 'admin' },
  }),
}));

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

beforeEach(() => {
  mockGetUsers.mockReset();
  mockCreateUser.mockReset();
  mockDeleteUser.mockReset();
  mockGetUsers.mockResolvedValue(mockUsers);
});

afterEach(cleanup);

describe('UserManager', () => {
  it('renders the heading', async () => {
    render(<UserManager />);
    expect(screen.getByText('Users')).toBeDefined();
  });

  it('shows loading state initially', () => {
    mockGetUsers.mockReturnValue(new Promise(() => {})); // never resolves
    render(<UserManager />);
    expect(screen.getByText('Loading users...')).toBeDefined();
  });

  it('renders user table after loading', async () => {
    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeDefined();
    });
    expect(screen.getByText('viewer@test.com')).toBeDefined();
  });

  it('shows empty state when no users', async () => {
    mockGetUsers.mockResolvedValue([]);
    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeDefined();
    });
  });

  it('does not show delete button for current user', async () => {
    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeDefined();
    });
    // Only one Delete button (for viewer, not for admin who is current user)
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(1);
  });

  it('shows error when loading fails', async () => {
    mockGetUsers.mockRejectedValue(new Error('Network error'));
    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeDefined();
    });
  });

  it('renders the create user form', async () => {
    render(<UserManager />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByLabelText('Role')).toBeDefined();
    expect(screen.getByText('Create User')).toBeDefined();
  });

  it('calls createUser and reloads on form submit', async () => {
    const newUser = { id: 3, email: 'new@test.com', role: 'viewer', created_at: '2026-01-03' };
    mockCreateUser.mockResolvedValue(newUser);
    mockGetUsers.mockResolvedValueOnce(mockUsers).mockResolvedValueOnce([...mockUsers, newUser]);

    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'viewer' } });
    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith('new@test.com', 'StrongPass1!', 'viewer');
    });
  });

  it('shows error on create failure', async () => {
    mockCreateUser.mockRejectedValue(new Error('Email already exists'));

    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dup@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeDefined();
    });
  });

  it('calls deleteUser after confirmation', async () => {
    mockDeleteUser.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('viewer@test.com')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith(2);
    });

    vi.mocked(window.confirm).mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('viewer@test.com')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteUser).not.toHaveBeenCalled();

    vi.mocked(window.confirm).mockRestore();
  });

  it('renders table headers', async () => {
    render(<UserManager />);
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeDefined();
    });
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain('Email');
    expect(headerTexts).toContain('Role');
    expect(headerTexts).toContain('Created');
  });
});
