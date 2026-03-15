import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import TokenManager from './TokenManager';
import { ToastProvider } from './Toast';
import * as api from '../api';

vi.mock('../api', () => ({
  getTokens: vi.fn(),
  createToken: vi.fn(),
  deleteToken: vi.fn(),
}));

afterEach(cleanup);

function renderWithProviders() {
  return render(
    <ToastProvider>
      <TokenManager />
    </ToastProvider>,
  );
}

describe('TokenManager', () => {
  beforeEach(() => {
    vi.mocked(api.getTokens).mockResolvedValue([]);
  });

  it('shows loading state initially', () => {
    vi.mocked(api.getTokens).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders();
    expect(screen.getByText('Loading tokens...')).toBeDefined();
  });

  it('shows empty state when no tokens', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('No API tokens yet.')).toBeDefined();
    });
  });

  it('renders token list with scope column', async () => {
    vi.mocked(api.getTokens).mockResolvedValue([
      { id: 1, name: 'CI Token', created_at: '2024-01-01', last_used_at: null, app_id: null },
      { id: 2, name: 'SDK Token', created_at: '2024-01-02', last_used_at: null, app_id: 'my-app' },
    ]);
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('CI Token')).toBeDefined();
      expect(screen.getByText('All apps')).toBeDefined();
      expect(screen.getByText('SDK Token')).toBeDefined();
      expect(screen.getByText('my-app')).toBeDefined();
    });
  });

  it('creates a token and shows it', async () => {
    vi.mocked(api.createToken).mockResolvedValue({ id: 21, name: 'tok123', token: 'tok123', app_id: null });
    vi.mocked(api.getTokens).mockResolvedValue([]);
    renderWithProviders();
    await waitFor(() => expect(screen.getByText('No API tokens yet.')).toBeDefined());

    const input = screen.getByPlaceholderText('Token name (e.g. CI pipeline)');
    fireEvent.change(input, { target: { value: 'My Token' } });
    fireEvent.click(screen.getByText('Create Token'));

    await waitFor(() => {
      expect(screen.getByText('tok123')).toBeDefined();
      expect(screen.getByText(/copy it now/i)).toBeDefined();
    });
  });

  it('shows error when loading fails', async () => {
    vi.mocked(api.getTokens).mockRejectedValue(new Error('Network error'));
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('Failed to load tokens')).toBeDefined();
    });
  });

  it('shows error when creation fails', async () => {
    vi.mocked(api.createToken).mockRejectedValue(new Error('Duplicate name'));
    renderWithProviders();
    await waitFor(() => expect(screen.getByText('No API tokens yet.')).toBeDefined());

    const input = screen.getByPlaceholderText('Token name (e.g. CI pipeline)');
    fireEvent.change(input, { target: { value: 'dup' } });
    fireEvent.click(screen.getByText('Create Token'));

    await waitFor(() => {
      expect(screen.getAllByText('Duplicate name').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('dismisses the new token display', async () => {
    vi.mocked(api.createToken).mockResolvedValue({ id: 21, name: 'tok123', token: 'tok123', app_id: null });
    renderWithProviders();
    await waitFor(() => expect(screen.getByText('No API tokens yet.')).toBeDefined());

    const input = screen.getByPlaceholderText('Token name (e.g. CI pipeline)');
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Create Token'));

    await waitFor(() => expect(screen.getByText('tok123')).toBeDefined());
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByText('tok123')).toBeNull();
  });
});
