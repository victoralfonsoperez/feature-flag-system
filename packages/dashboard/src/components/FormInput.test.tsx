import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import FormInput from './FormInput';

afterEach(cleanup);

describe('FormInput', () => {
  it('renders label and input', () => {
    render(<FormInput id="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('applies idle border by default', () => {
    render(<FormInput id="name" label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).toContain('border-gray-600');
  });

  it('applies error border when status is error', () => {
    render(<FormInput id="name" label="Name" status="error" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).toContain('border-red-500');
    expect(input.className).toContain('focus:ring-red-500');
  });

  it('applies success border when status is success', () => {
    render(<FormInput id="name" label="Name" status="success" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).toContain('border-green-500');
    expect(input.className).toContain('focus:ring-green-500');
  });

  it('applies warning border when status is warning', () => {
    render(<FormInput id="name" label="Name" status="warning" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).toContain('border-amber-500');
    expect(input.className).toContain('focus:ring-amber-500');
  });

  it('renders validation messages', () => {
    const messages = [
      { text: 'Too short', type: 'error' as const },
      { text: 'Looks good', type: 'success' as const },
    ];
    render(<FormInput id="pw" label="Password" messages={messages} />);
    expect(screen.getByText('Too short')).toBeDefined();
    expect(screen.getByText('Looks good')).toBeDefined();
  });

  it('does not render messages list when messages is empty', () => {
    const { container } = render(<FormInput id="pw" label="Password" messages={[]} />);
    expect(container.querySelector('ul')).toBeNull();
  });

  it('passes through HTML input props', () => {
    render(<FormInput id="pw" label="Password" type="password" placeholder="Enter password" />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.placeholder).toBe('Enter password');
  });
});
