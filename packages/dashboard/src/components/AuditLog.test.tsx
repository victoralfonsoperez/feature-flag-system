import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import AuditLog from './AuditLog';
import type { AuditLogEntry } from '../types';

vi.mock('../api', () => ({
  getAuditLog: vi.fn(),
}));

import { getAuditLog } from '../api';
const mockGetAuditLog = vi.mocked(getAuditLog);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockEntries: AuditLogEntry[] = [
  {
    id: 3,
    flag_key: 'dark-mode',
    action: 'deleted',
    old_value: 'true',
    new_value: null,
    changed_by: 'admin@test.com',
    changed_at: '2026-03-01T12:00:00Z',
  },
  {
    id: 2,
    flag_key: 'dark-mode',
    action: 'updated',
    old_value: 'false',
    new_value: 'true',
    changed_by: 'admin@test.com',
    changed_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 1,
    flag_key: 'dark-mode',
    action: 'created',
    old_value: null,
    new_value: 'false',
    changed_by: 'admin@test.com',
    changed_at: '2026-02-01T09:00:00Z',
  },
];

describe('AuditLog', () => {
  it('shows loading state', () => {
    mockGetAuditLog.mockReturnValue(new Promise(() => {}));
    render(<AuditLog />);
    expect(screen.getByText('Loading activity log...')).toBeDefined();
  });

  it('shows empty state when no entries', async () => {
    mockGetAuditLog.mockResolvedValue([]);
    render(<AuditLog />);
    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet.')).toBeDefined();
    });
  });

  it('renders table with entries', async () => {
    mockGetAuditLog.mockResolvedValue(mockEntries);
    render(<AuditLog />);
    await waitFor(() => {
      expect(screen.getAllByText('dark-mode').length).toBe(3);
    });
    expect(screen.getAllByText('admin@test.com').length).toBe(3);
    expect(screen.getByText('2026-03-01T12:00:00Z')).toBeDefined();
  });

  it('action badges have correct colors', async () => {
    mockGetAuditLog.mockResolvedValue(mockEntries);
    render(<AuditLog />);
    await waitFor(() => {
      expect(screen.getByText('created')).toBeDefined();
    });

    const created = screen.getByText('created');
    const updated = screen.getByText('updated');
    const deleted = screen.getByText('deleted');

    expect(created.className).toContain('bg-green-900/40');
    expect(updated.className).toContain('bg-blue-900/40');
    expect(deleted.className).toContain('bg-red-900/40');
  });

  it('passes flagKey to API call', async () => {
    mockGetAuditLog.mockResolvedValue(mockEntries);
    render(<AuditLog flagKey="dark-mode" />);
    await waitFor(() => {
      expect(mockGetAuditLog).toHaveBeenCalledWith('dark-mode', undefined);
    });
    expect(screen.getByText('Activity Log: dark-mode')).toBeDefined();
  });

  it('shows null values as dash', async () => {
    mockGetAuditLog.mockResolvedValue([mockEntries[2]]); // created entry with null old_value
    render(<AuditLog />);
    await waitFor(() => {
      expect(screen.getByText('created')).toBeDefined();
    });
    // old_value is null for created, should show —
    const cells = document.querySelectorAll('td');
    const oldValueCell = cells[2]; // 3rd column (0-indexed)
    expect(oldValueCell.textContent).toBe('—');
  });
});
