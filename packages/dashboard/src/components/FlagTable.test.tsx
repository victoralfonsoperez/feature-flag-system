import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import FlagTable from './FlagTable';
import type { Flag } from '../types';

afterEach(cleanup);

const noop = () => {};

const mockFlags: Flag[] = [
  {
    key: 'dark-mode',
    value: 'true',
    type: 'runtime',
    environment: 'production',
    description: 'Enable dark mode',
    variants: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    updated_by: 'api-token',
  },
  {
    key: 'cdn-url',
    value: 'https://cdn.example.com',
    type: 'build-time',
    environment: 'staging',
    description: 'CDN base URL',
    variants: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    updated_by: 'system',
  },
];

const defaultProps = {
  flags: mockFlags,
  loading: false,
  error: null as string | null,
  onRetry: noop,
  onToggle: noop,
  onEdit: noop as (flag: Flag) => void,
};

describe('FlagTable', () => {
  it('shows loading skeleton', () => {
    render(<FlagTable {...defaultProps} flags={[]} loading={true} />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows empty state when no flags', () => {
    render(<FlagTable {...defaultProps} flags={[]} />);
    expect(
      screen.getByText('No flags found for this environment.'),
    ).toBeDefined();
  });

  it('renders table headers including Environment', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getByText('Key')).toBeDefined();
    expect(screen.getByText('Value')).toBeDefined();
    expect(screen.getByText('Type')).toBeDefined();
    expect(screen.getByText('Environment')).toBeDefined();
    expect(screen.getByText('Updated')).toBeDefined();
  });

  it('renders flag rows with correct data', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getByText('dark-mode')).toBeDefined();
    expect(screen.getByText('cdn-url')).toBeDefined();
    expect(screen.getByText('https://cdn.example.com')).toBeDefined();
  });

  it('renders Environment column values', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getByText('production')).toBeDefined();
    expect(screen.getByText('staging')).toBeDefined();
  });

  it('renders type badges with correct styling', () => {
    render(<FlagTable {...defaultProps} />);
    const runtimeBadge = screen.getByText('runtime');
    const buildTimeBadge = screen.getByText('build-time');

    expect(runtimeBadge.className).toContain('bg-blue-100');
    expect(buildTimeBadge.className).toContain('bg-amber-100');
  });

  it('displays updated_at timestamps', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getByText('2026-01-15T00:00:00Z')).toBeDefined();
    expect(screen.getByText('2026-01-10T00:00:00Z')).toBeDefined();
  });

  it('shows toggle switch for boolean flags', () => {
    render(<FlagTable {...defaultProps} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('toggle calls onToggle with correct args', () => {
    const onToggle = vi.fn();
    render(<FlagTable {...defaultProps} onToggle={onToggle} />);
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith('dark-mode', 'false');
  });

  it('non-boolean flags show plain text value', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getByText('https://cdn.example.com')).toBeDefined();
    // Only one toggle (for dark-mode), not for cdn-url
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBe(1);
  });

  it('shows error state with retry button', () => {
    render(<FlagTable {...defaultProps} flags={[]} error="Network error" />);
    expect(screen.getByText('Network error')).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('retry button calls onRetry', () => {
    const onRetry = vi.fn();
    render(<FlagTable {...defaultProps} flags={[]} error="Network error" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders Edit button for each flag row', () => {
    render(<FlagTable {...defaultProps} />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(2);
  });

  it('Edit button calls onEdit with the flag', () => {
    const onEdit = vi.fn();
    render(<FlagTable {...defaultProps} onEdit={onEdit} />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockFlags[0]);
  });
});
