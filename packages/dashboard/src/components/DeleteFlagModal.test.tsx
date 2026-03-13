import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import DeleteFlagModal from './DeleteFlagModal';
import type { Flag } from '../types';

afterEach(cleanup);

const mockFlag: Flag = {
  app_id: 'default',
  key: 'dark-mode',
  value: 'true',
  type: 'runtime',
  environment: 'production',
  description: 'Enable dark mode',
  variants: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  updated_by: 'api-token',
};

const noop = async () => {};

describe('DeleteFlagModal', () => {
  it('renders flag key in confirmation message', () => {
    render(<DeleteFlagModal flag={mockFlag} onConfirm={noop} onClose={noop} />);
    expect(screen.getByText('dark-mode')).toBeDefined();
    expect(screen.getByText('Delete Flag')).toBeDefined();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteFlagModal flag={mockFlag} onConfirm={noop} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<DeleteFlagModal flag={mockFlag} onConfirm={noop} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteFlagModal flag={mockFlag} onConfirm={noop} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onConfirm with flag key on Delete click', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<DeleteFlagModal flag={mockFlag} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('dark-mode');
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error on API failure', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Delete failed'));
    render(<DeleteFlagModal flag={mockFlag} onConfirm={onConfirm} onClose={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeDefined();
    });
  });

  it('shows Deleting... while in progress', async () => {
    let resolve: () => void;
    const onConfirm = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    render(<DeleteFlagModal flag={mockFlag} onConfirm={onConfirm} onClose={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeDefined();
    });

    resolve!();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined();
    });
  });

  it('has aria-modal and aria-label attributes', () => {
    render(<DeleteFlagModal flag={mockFlag} onConfirm={noop} onClose={noop} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Delete flag dark-mode');
  });
});
