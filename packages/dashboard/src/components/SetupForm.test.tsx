import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import SetupForm from './SetupForm';

const mockLogin = vi.fn();
const mockSetup = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    login: (...args: unknown[]) => mockLogin(...args),
  }),
}));

vi.mock('../api', () => ({
  setup: (...args: unknown[]) => mockSetup(...args),
}));

beforeEach(() => {
  mockLogin.mockReset();
  mockSetup.mockReset();
});

afterEach(cleanup);

describe('SetupForm', () => {
  it('renders the heading and description', () => {
    render(<SetupForm />);
    expect(screen.getByRole('heading', { name: 'Create Admin Account' })).toBeDefined();
    expect(screen.getByText('Set up the first admin user to get started.')).toBeDefined();
  });

  it('renders email and password fields', () => {
    render(<SetupForm />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('submit button is disabled when form is empty', () => {
    render(<SetupForm />);
    const button = screen.getByRole('button', { name: 'Create Admin Account' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('shows email validation error on blur with invalid email', () => {
    render(<SetupForm />);
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'bad' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText('Enter a valid email address')).toBeDefined();
  });

  it('shows password strength bar and requirements when typing', () => {
    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ab' } });

    expect(screen.getByText('weak')).toBeDefined();
    expect(screen.getByText('At least 8 characters')).toBeDefined();
    expect(screen.getByText('One uppercase letter')).toBeDefined();
    expect(screen.getByText('One number')).toBeDefined();
  });

  it('shows strong strength with valid password', () => {
    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    expect(screen.getByText('strong')).toBeDefined();
  });

  it('enables submit with valid email and strong password', () => {
    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    const button = screen.getByRole('button', { name: 'Create Admin Account' });
    expect(button).toHaveProperty('disabled', false);
  });

  it('keeps submit disabled with weak password', () => {
    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    const button = screen.getByRole('button', { name: 'Create Admin Account' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('calls setup and login on submit', async () => {
    mockSetup.mockResolvedValue({ user: { id: 1, email: 'admin@test.com', role: 'admin' } });
    mockLogin.mockResolvedValue(undefined);

    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Admin Account' }));

    await waitFor(() => {
      expect(mockSetup).toHaveBeenCalledWith('admin@test.com', 'StrongPass1!');
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'StrongPass1!');
    });
  });

  it('shows loading state during submission', async () => {
    mockSetup.mockReturnValue(new Promise(() => {}));
    render(<SetupForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Admin Account' }));

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeDefined();
    });
  });

  it('shows error on setup failure', async () => {
    mockSetup.mockRejectedValue(new Error('Setup failed'));
    render(<SetupForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Admin Account' }));

    await waitFor(() => {
      expect(screen.getByText('Setup failed')).toBeDefined();
    });
  });
});
