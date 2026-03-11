import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import CreateFlagForm from './CreateFlagForm';

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

afterEach(cleanup);

const noop = async () => {};

describe('CreateFlagForm', () => {
  it('renders all form fields', () => {
    render(<CreateFlagForm onSubmit={noop} />);
    expect(screen.getByLabelText('Key')).toBeDefined();
    expect(screen.getByLabelText('Value')).toBeDefined();
    expect(screen.getByLabelText('Type')).toBeDefined();
    expect(screen.getByLabelText('Environment')).toBeDefined();
    expect(screen.getByLabelText('Description')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create Flag' })).toBeDefined();
  });

  it('shows validation error for empty key on submit', async () => {
    render(<CreateFlagForm onSubmit={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));
    await waitFor(() => {
      expect(screen.getByText('Key is required')).toBeDefined();
    });
  });

  it('shows validation error for key with spaces', async () => {
    render(<CreateFlagForm onSubmit={noop} />);
    const keyInput = screen.getByLabelText('Key');
    fireEvent.change(keyInput, { target: { value: 'has space' } });
    fireEvent.blur(keyInput);
    expect(screen.getByText('Key cannot contain spaces')).toBeDefined();
  });

  it('shows validation error for invalid key characters', async () => {
    render(<CreateFlagForm onSubmit={noop} />);
    const keyInput = screen.getByLabelText('Key');
    fireEvent.change(keyInput, { target: { value: 'inv@lid!' } });
    fireEvent.blur(keyInput);
    expect(screen.getByText('Key must be alphanumeric with dashes or underscores')).toBeDefined();
  });

  it('shows validation error for empty value on submit', async () => {
    render(<CreateFlagForm onSubmit={noop} />);
    const keyInput = screen.getByLabelText('Key');
    fireEvent.change(keyInput, { target: { value: 'valid-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));
    await waitFor(() => {
      expect(screen.getByText('Value is required')).toBeDefined();
    });
  });

  it('calls onSubmit with correct data on valid submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'my-flag' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'build-time' } });
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'staging' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A test flag' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        key: 'my-flag',
        value: 'true',
        type: 'build-time',
        environment: 'staging',
        description: 'A test flag',
      });
    });
  });

  it('resets form after successful submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'my-flag' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect((screen.getByLabelText('Key') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Value') as HTMLInputElement).value).toBe('');
    });
  });

  it('shows API error on submission failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Flag already exists'));
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'my-flag' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect(screen.getByText('Flag already exists')).toBeDefined();
    });
  });

  it('shows Creating... while submitting', async () => {
    let resolve: () => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'my-flag' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeDefined();
    });

    resolve!();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Flag' })).toBeDefined();
    });
  });

  it('does not submit when key is invalid', async () => {
    const onSubmit = vi.fn();
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'inv@lid' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows build-time warning when type is build-time', () => {
    render(<CreateFlagForm onSubmit={noop} />);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'build-time' } });
    expect(screen.getByText(/Build-time flags require a rebuild/)).toBeDefined();
  });

  it('does not show build-time warning when type is runtime', () => {
    render(<CreateFlagForm onSubmit={noop} />);
    expect(screen.queryByText(/Build-time flags require a rebuild/)).toBeNull();
  });

  it('shows variant editor when Add variants checkbox is checked', () => {
    render(<CreateFlagForm onSubmit={noop} />);
    fireEvent.click(screen.getByLabelText('Add variants'));
    expect(screen.getByText('+ Add Variant')).toBeDefined();
  });

  it('hides variant editor when checkbox is unchecked', () => {
    render(<CreateFlagForm onSubmit={noop} />);
    fireEvent.click(screen.getByLabelText('Add variants'));
    expect(screen.getByText('+ Add Variant')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Add variants'));
    expect(screen.queryByText('+ Add Variant')).toBeNull();
  });

  it('includes variants in submission when enabled', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'ab-test' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByLabelText('Add variants'));
    fireEvent.click(screen.getByText('+ Add Variant'));
    fireEvent.change(screen.getByLabelText('Variant 1 name'), { target: { value: 'a' } });
    fireEvent.change(screen.getByLabelText('Variant 1 value'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Variant 1 weight'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        key: 'ab-test',
        value: 'true',
        type: 'runtime',
        environment: 'production',
        description: undefined,
        variants: JSON.stringify([{ name: 'a', value: 'x', weight: 100 }]),
      });
    });
  });

  it('shows variant validation error for invalid weights', async () => {
    const onSubmit = vi.fn();
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'ab-test' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByLabelText('Add variants'));
    fireEvent.click(screen.getByText('+ Add Variant'));
    // weight defaults to 0, which is invalid
    fireEvent.change(screen.getByLabelText('Variant 1 name'), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect(screen.getByText('All variant weights must be positive integers')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('omits description when empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateFlagForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'my-flag' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Flag' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        key: 'my-flag',
        value: 'true',
        type: 'runtime',
        environment: 'production',
        description: undefined,
      });
    });
  });
});
