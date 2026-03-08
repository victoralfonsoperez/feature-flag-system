import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from './Header';
import type { Environment } from '../types';

// Mock useAuth
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@test.com', role: 'admin' },
    logout: vi.fn(),
  }),
}));

afterEach(cleanup);

const defaultProps = {
  environment: 'production' as Environment,
  onEnvironmentChange: () => {},
  view: 'flags' as const,
  onViewChange: () => {},
};

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Feature Flags')).toBeDefined();
  });

  it('displays the current environment in the selector', () => {
    render(<Header {...defaultProps} environment="staging" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('staging');
  });

  it('renders all three environment options', () => {
    render(<Header {...defaultProps} />);
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual([
      'production',
      'staging',
      'development',
    ]);
  });

  it('calls onEnvironmentChange when selection changes', () => {
    const onChange = vi.fn();
    render(<Header {...defaultProps} onEnvironmentChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'development' },
    });

    expect(onChange).toHaveBeenCalledWith('development' as Environment);
  });

  it('shows user email and logout button', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('admin@test.com')).toBeDefined();
    expect(screen.getByText('Logout')).toBeDefined();
  });

  it('shows Flags and API Tokens navigation', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Flags')).toBeDefined();
    expect(screen.getByText('API Tokens')).toBeDefined();
  });
});
