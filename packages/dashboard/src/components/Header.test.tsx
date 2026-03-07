import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from './Header';
import type { Environment } from '../types';

afterEach(cleanup);

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header environment="production" onEnvironmentChange={() => {}} />);
    expect(screen.getByText('Feature Flags')).toBeDefined();
  });

  it('displays the current environment in the selector', () => {
    render(<Header environment="staging" onEnvironmentChange={() => {}} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('staging');
  });

  it('renders all three environment options', () => {
    render(<Header environment="production" onEnvironmentChange={() => {}} />);
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual([
      'production',
      'staging',
      'development',
    ]);
  });

  it('calls onEnvironmentChange when selection changes', () => {
    const onChange = vi.fn();
    render(<Header environment="production" onEnvironmentChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'development' },
    });

    expect(onChange).toHaveBeenCalledWith('development' as Environment);
  });
});
