import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import FlagTable from './FlagTable';
import type { Flag } from '../types';

afterEach(cleanup);

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
    environment: 'production',
    description: 'CDN base URL',
    variants: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    updated_by: 'system',
  },
];

describe('FlagTable', () => {
  it('shows loading state', () => {
    render(<FlagTable flags={[]} loading={true} />);
    expect(screen.getByText('Loading flags...')).toBeDefined();
  });

  it('shows empty state when no flags', () => {
    render(<FlagTable flags={[]} loading={false} />);
    expect(
      screen.getByText('No flags found for this environment.'),
    ).toBeDefined();
  });

  it('renders table headers', () => {
    render(<FlagTable flags={mockFlags} loading={false} />);
    expect(screen.getByText('Key')).toBeDefined();
    expect(screen.getByText('Value')).toBeDefined();
    expect(screen.getByText('Type')).toBeDefined();
    expect(screen.getByText('Updated')).toBeDefined();
  });

  it('renders flag rows with correct data', () => {
    render(<FlagTable flags={mockFlags} loading={false} />);
    expect(screen.getByText('dark-mode')).toBeDefined();
    expect(screen.getByText('true')).toBeDefined();
    expect(screen.getByText('cdn-url')).toBeDefined();
    expect(screen.getByText('https://cdn.example.com')).toBeDefined();
  });

  it('renders type badges with correct styling', () => {
    render(<FlagTable flags={mockFlags} loading={false} />);
    const runtimeBadge = screen.getByText('runtime');
    const buildTimeBadge = screen.getByText('build-time');

    expect(runtimeBadge.className).toContain('bg-blue-100');
    expect(buildTimeBadge.className).toContain('bg-amber-100');
  });

  it('displays updated_at timestamps', () => {
    render(<FlagTable flags={mockFlags} loading={false} />);
    expect(screen.getByText('2026-01-15T00:00:00Z')).toBeDefined();
    expect(screen.getByText('2026-01-10T00:00:00Z')).toBeDefined();
  });

  it('does not show table when loading', () => {
    render(<FlagTable flags={mockFlags} loading={true} />);
    expect(screen.queryByRole('table')).toBeNull();
  });
});
