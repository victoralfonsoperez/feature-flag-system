import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import EditFlagModal from './EditFlagModal';
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

describe('EditFlagModal', () => {
  it('renders with flag key displayed', () => {
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={noop} />);
    expect(screen.getByText('Edit Flag')).toBeDefined();
    expect(screen.getByText('dark-mode')).toBeDefined();
  });

  it('pre-populates value and description', () => {
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={noop} />);
    expect((screen.getByLabelText('Value') as HTMLInputElement).value).toBe('true');
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('Enable dark mode');
  });

  it('calls onSave with updated values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<EditFlagModal flag={mockFlag} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'false' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated desc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('dark-mode', {
        value: 'false',
        description: 'Updated desc',
      });
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation error for empty value', async () => {
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={noop} />);

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Value is required')).toBeDefined();
    });
  });

  it('does not submit when value is empty', async () => {
    const onSave = vi.fn();
    render(<EditFlagModal flag={mockFlag} onSave={onSave} onClose={noop} />);

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows API error on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Update failed'));
    render(<EditFlagModal flag={mockFlag} onSave={onSave} onClose={noop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeDefined();
    });
  });

  it('shows Saving... while submitting', async () => {
    let resolve: () => void;
    const onSave = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    render(<EditFlagModal flag={mockFlag} onSave={onSave} onClose={noop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeDefined();
    });

    resolve!();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={onClose} />);

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has aria-modal and aria-label attributes', () => {
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={noop} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Edit flag dark-mode');
  });

  it('shows build-time warning for build-time flag', () => {
    const buildTimeFlag: Flag = { ...mockFlag, type: 'build-time' };
    render(<EditFlagModal flag={buildTimeFlag} onSave={noop} onClose={noop} />);
    expect(screen.getByText(/This is a build-time flag/)).toBeDefined();
  });

  it('does not show build-time warning for runtime flag', () => {
    render(<EditFlagModal flag={mockFlag} onSave={noop} onClose={noop} />);
    expect(screen.queryByText(/This is a build-time flag/)).toBeNull();
  });

  it('renders variant editor with parsed variants', () => {
    const flagWithVariants: Flag = {
      ...mockFlag,
      variants: JSON.stringify([
        { name: 'control', value: 'off', weight: 50 },
        { name: 'treatment', value: 'on', weight: 50 },
      ]),
    };
    render(<EditFlagModal flag={flagWithVariants} onSave={noop} onClose={noop} />);
    expect((screen.getByLabelText('Variant 1 name') as HTMLInputElement).value).toBe('control');
    expect((screen.getByLabelText('Variant 2 name') as HTMLInputElement).value).toBe('treatment');
  });

  it('includes variants in save payload', async () => {
    const flagWithVariants: Flag = {
      ...mockFlag,
      variants: JSON.stringify([{ name: 'a', value: 'x', weight: 100 }]),
    };
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditFlagModal flag={flagWithVariants} onSave={onSave} onClose={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('dark-mode', {
        value: 'true',
        description: 'Enable dark mode',
        variants: JSON.stringify([{ name: 'a', value: 'x', weight: 100 }]),
      });
    });
  });

  it('shows variant validation error for zero weight', async () => {
    const flagWithVariants: Flag = {
      ...mockFlag,
      variants: JSON.stringify([{ name: 'a', value: 'x', weight: 0 }]),
    };
    const onSave = vi.fn();
    render(<EditFlagModal flag={flagWithVariants} onSave={onSave} onClose={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByText('All variant weights must be positive integers')).toBeDefined();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('omits variants when all removed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditFlagModal flag={mockFlag} onSave={onSave} onClose={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('dark-mode', {
        value: 'true',
        description: 'Enable dark mode',
      });
    });
  });

  it('omits description when cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditFlagModal flag={mockFlag} onSave={onSave} onClose={noop} />);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('dark-mode', {
        value: 'true',
        description: undefined,
      });
    });
  });
});
