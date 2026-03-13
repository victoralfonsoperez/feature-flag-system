import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
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
  onDelete: noop as (flag: Flag) => void,
  onViewHistory: noop as (flagKey: string) => void,
  onRevert: noop as (flag: Flag) => void,
};

describe('FlagTable', () => {
  it('shows loading skeleton', () => {
    render(<FlagTable {...defaultProps} flags={[]} loading={true} />);
    expect(document.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
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
    expect(screen.getByText('Environment')).toBeDefined();
    expect(screen.getByText('Updated')).toBeDefined();
  });

  it('renders flag data in both mobile and desktop views', () => {
    render(<FlagTable {...defaultProps} />);
    // Both mobile cards and desktop table render the same data
    expect(screen.getAllByText('dark-mode').length).toBe(2);
    expect(screen.getAllByText('cdn-url').length).toBe(2);
    expect(screen.getAllByText('https://cdn.example.com').length).toBe(2);
  });

  it('renders type badges with correct styling', () => {
    render(<FlagTable {...defaultProps} />);
    const runtimeBadges = screen.getAllByText('runtime');
    const buildTimeBadges = screen.getAllByText('build-time');

    expect(runtimeBadges[0].className).toContain('bg-blue-900/40');
    expect(buildTimeBadges[0].className).toContain('bg-amber-900/40');
  });

  it('displays updated_at timestamps', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getAllByText('2026-01-15T00:00:00Z').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2026-01-10T00:00:00Z').length).toBeGreaterThanOrEqual(1);
  });

  it('shows toggle switch for boolean flags', () => {
    render(<FlagTable {...defaultProps} />);
    // 2 toggle switches: one in mobile card, one in desktop table
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBe(2);
    expect(toggles[0].getAttribute('aria-checked')).toBe('true');
  });

  it('toggle calls onToggle with correct args', () => {
    const onToggle = vi.fn();
    render(<FlagTable {...defaultProps} onToggle={onToggle} />);
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[0]);
    expect(onToggle).toHaveBeenCalledWith('dark-mode', 'false');
  });

  it('non-boolean flags show plain text value', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.getAllByText('https://cdn.example.com').length).toBe(2);
    // 2 toggles for dark-mode (mobile + desktop), none for cdn-url
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBe(2);
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

  it('renders Edit button for each flag in both views', () => {
    render(<FlagTable {...defaultProps} />);
    const editButtons = screen.getAllByText('Edit');
    // 2 flags x 2 views (mobile + desktop) = 4
    expect(editButtons.length).toBe(4);
  });

  it('Edit button calls onEdit with the flag', () => {
    const onEdit = vi.fn();
    render(<FlagTable {...defaultProps} onEdit={onEdit} />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockFlags[0]);
  });

  it('renders Delete button for each flag in both views', () => {
    render(<FlagTable {...defaultProps} />);
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(4);
  });

  it('Delete button calls onDelete with the flag', () => {
    const onDelete = vi.fn();
    render(<FlagTable {...defaultProps} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(mockFlags[0]);
  });

  it('shows variant badge when flag has variants', () => {
    const flagsWithVariants: Flag[] = [
      {
        ...mockFlags[0],
        variants: JSON.stringify([
          { name: 'a', value: 'x', weight: 50 },
          { name: 'b', value: 'y', weight: 50 },
          { name: 'c', value: 'z', weight: 50 },
        ]),
      },
    ];
    render(<FlagTable {...defaultProps} flags={flagsWithVariants} />);
    // Mobile + desktop = 2 badges
    const badges = screen.getAllByText('3 variants');
    expect(badges.length).toBe(2);
  });

  it('shows singular variant badge for one variant', () => {
    const flagsWithOneVariant: Flag[] = [
      {
        ...mockFlags[0],
        variants: JSON.stringify([{ name: 'a', value: 'x', weight: 100 }]),
      },
    ];
    render(<FlagTable {...defaultProps} flags={flagsWithOneVariant} />);
    const badges = screen.getAllByText('1 variant');
    expect(badges.length).toBe(2);
  });

  it('does not show variant badge when variants is null', () => {
    render(<FlagTable {...defaultProps} />);
    expect(screen.queryByText(/variant/)).toBeNull();
  });

  describe('search/filter', () => {
    it('renders search input', () => {
      render(<FlagTable {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search by key, description, or type...')).toBeDefined();
    });

    it('filters flags by key', () => {
      render(<FlagTable {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText('Search by key, description, or type...'), { target: { value: 'dark' } });
      expect(screen.getAllByText('dark-mode').length).toBeGreaterThan(0);
      expect(screen.queryByText('cdn-url')).toBeNull();
    });

    it('filters flags by description', () => {
      render(<FlagTable {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText('Search by key, description, or type...'), { target: { value: 'CDN base' } });
      expect(screen.getAllByText('cdn-url').length).toBeGreaterThan(0);
      expect(screen.queryByText('dark-mode')).toBeNull();
    });

    it('filters flags by type', () => {
      render(<FlagTable {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText('Search by key, description, or type...'), { target: { value: 'build-time' } });
      expect(screen.getAllByText('cdn-url').length).toBeGreaterThan(0);
      expect(screen.queryByText('dark-mode')).toBeNull();
    });

    it('shows "no results" message when search matches nothing', () => {
      render(<FlagTable {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText('Search by key, description, or type...'), { target: { value: 'nonexistent' } });
      expect(screen.getByText('No flags match your search.')).toBeDefined();
    });

    it('shows all flags when search is cleared', () => {
      render(<FlagTable {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search by key, description, or type...');
      fireEvent.change(input, { target: { value: 'dark' } });
      expect(screen.queryByText('cdn-url')).toBeNull();
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getAllByText('dark-mode').length).toBeGreaterThan(0);
      expect(screen.getAllByText('cdn-url').length).toBeGreaterThan(0);
    });
  });

  describe('revert button', () => {
    it('renders Revert button for each flag', () => {
      render(<FlagTable {...defaultProps} />);
      const revertButtons = screen.getAllByText('Revert');
      // 2 flags x 2 views (mobile + desktop) = 4
      expect(revertButtons.length).toBe(4);
    });

    it('Revert button calls onRevert with the flag', () => {
      const onRevert = vi.fn();
      render(<FlagTable {...defaultProps} onRevert={onRevert} />);
      const revertButtons = screen.getAllByText('Revert');
      fireEvent.click(revertButtons[0]);
      expect(onRevert).toHaveBeenCalledWith(mockFlags[0]);
    });
  });

  describe('build-time toggle warning', () => {
    const buildTimeBoolFlag: Flag = {
      key: 'enable-ssr',
      value: 'true',
      type: 'build-time',
      environment: 'production',
      description: 'Enable SSR',
      variants: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
      updated_by: 'api-token',
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows transient warning after toggling a build-time flag', () => {
      const onToggle = vi.fn();
      render(<FlagTable {...defaultProps} flags={[buildTimeBoolFlag]} onToggle={onToggle} />);
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[0]);
      expect(onToggle).toHaveBeenCalledWith('enable-ssr', 'false');
      expect(screen.getByText(/Changes will take effect after a rebuild/)).toBeDefined();
    });

    it('auto-dismisses the warning after 5 seconds', () => {
      const onToggle = vi.fn();
      render(<FlagTable {...defaultProps} flags={[buildTimeBoolFlag]} onToggle={onToggle} />);
      fireEvent.click(screen.getAllByRole('switch')[0]);
      expect(screen.getByText(/Changes will take effect after a rebuild/)).toBeDefined();
      act(() => { vi.advanceTimersByTime(5000); });
      expect(screen.queryByText(/Changes will take effect after a rebuild/)).toBeNull();
    });

    it('does not show warning after toggling a runtime flag', () => {
      const onToggle = vi.fn();
      render(<FlagTable {...defaultProps} onToggle={onToggle} />);
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[0]);
      expect(screen.queryByText(/Changes will take effect after a rebuild/)).toBeNull();
    });
  });
});
