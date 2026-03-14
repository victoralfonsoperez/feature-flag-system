import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from './Header';
import type { Environment } from '../types';

// Mock useAuth
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'auth0|1', email: 'admin@test.com', role: 'admin' },
    logout: vi.fn(),
  }),
}));

afterEach(cleanup);

const defaultProps = {
  environment: 'production' as Environment,
  onEnvironmentChange: () => {},
  appId: 'default',
  onAppIdChange: () => {},
  view: 'flags' as const,
  onViewChange: () => {},
};

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Kanary')).toBeDefined();
  });

  it('renders all navigation buttons', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getAllByText('Flags').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('API Tokens').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Activity').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render Users nav button (removed with Auth0)', () => {
    render(<Header {...defaultProps} />);
    expect(screen.queryByText('Users')).toBeNull();
  });

  it('calls onViewChange when a nav button is clicked', () => {
    const onViewChange = vi.fn();
    render(<Header {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getAllByText('Activity')[0]);
    expect(onViewChange).toHaveBeenCalledWith('activity');
  });

  it('applies active style to button matching current view', () => {
    render(<Header {...defaultProps} view="tokens" />);
    const tokensButtons = screen.getAllByText('API Tokens');
    expect(tokensButtons[0].className).toContain('bg-gray-800');
  });

  it('shows user email', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getAllByText('admin@test.com').length).toBeGreaterThanOrEqual(1);
  });

  it('has a hamburger menu toggle button', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText('Toggle menu')).toBeDefined();
  });

  it('shows mobile menu when hamburger is clicked', () => {
    render(<Header {...defaultProps} />);
    const toggle = screen.getByLabelText('Toggle menu');
    fireEvent.click(toggle);
    // Should now have duplicate nav items (desktop + mobile)
    expect(screen.getAllByText('Flags').length).toBe(2);
  });

  it('renders settings button when onOpenSettings is provided', () => {
    render(<Header {...defaultProps} onOpenSettings={() => {}} />);
    expect(screen.getAllByLabelText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onOpenSettings when settings button is clicked', () => {
    const onOpenSettings = vi.fn();
    render(<Header {...defaultProps} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getAllByLabelText('Settings')[0]);
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('displays environment selector on flags view', () => {
    render(<Header {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    expect((selects[0] as HTMLSelectElement).value).toBe('production');
  });

  it('calls onEnvironmentChange when selection changes', () => {
    const onChange = vi.fn();
    render(<Header {...defaultProps} onEnvironmentChange={onChange} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'development' },
    });
    expect(onChange).toHaveBeenCalledWith('development');
  });

  it('renders app ID input with current value', () => {
    render(<Header {...defaultProps} appId="my-app" />);
    const inputs = screen.getAllByDisplayValue('my-app');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onAppIdChange on blur', () => {
    const onAppIdChange = vi.fn();
    render(<Header {...defaultProps} onAppIdChange={onAppIdChange} />);
    const input = screen.getByLabelText('App:', { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new-app' } });
    fireEvent.blur(input);
    expect(onAppIdChange).toHaveBeenCalledWith('new-app');
  });

  it('calls onAppIdChange on Enter key', () => {
    const onAppIdChange = vi.fn();
    render(<Header {...defaultProps} onAppIdChange={onAppIdChange} />);
    const input = screen.getByLabelText('App:', { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'enter-app' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAppIdChange).toHaveBeenCalledWith('enter-app');
  });
});
