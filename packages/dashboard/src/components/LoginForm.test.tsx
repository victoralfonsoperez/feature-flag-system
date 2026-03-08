import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import LoginForm from './LoginForm';

const mockLogin = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    login: (...args: unknown[]) => mockLogin(...args),
  }),
}));

beforeEach(() => {
  mockLogin.mockReset();
});

afterEach(cleanup);

describe('LoginForm', () => {
  it('renders the sign in heading', () => {
    render(<LoginForm />);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeDefined();
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('submit button is disabled when form is empty', () => {
    render(<LoginForm />);
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('submit button is enabled with valid email and password', () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button).toHaveProperty('disabled', false);
  });

  it('shows email validation error on blur with invalid email', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText('Enter a valid email address')).toBeDefined();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'mypassword');
    });
  });

  it('shows loading state during submission', async () => {
    mockLogin.mockReturnValue(new Promise(() => {})); // never resolves
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeDefined();
    });
  });

  it('shows error on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });
});
