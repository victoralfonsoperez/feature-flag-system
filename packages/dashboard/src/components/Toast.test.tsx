import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

afterEach(cleanup);

function TestConsumer() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Success!', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error!', 'error')}>Show Error</button>
    </div>
  );
}

describe('Toast', () => {
  it('shows a success toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeDefined();
    expect(screen.getByRole('alert').className).toContain('bg-green-900/30');
  });

  it('shows an error toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error!')).toBeDefined();
    expect(screen.getByRole('alert').className).toContain('bg-red-900/30');
  });

  it('dismisses toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Success!')).toBeNull();
  });

  it('auto-dismisses toast after timeout', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Success!')).toBeNull();
    vi.useRealTimers();
  });

  it('can show multiple toasts at once', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('throws when useToast is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useToast must be used within ToastProvider');
  });
});
