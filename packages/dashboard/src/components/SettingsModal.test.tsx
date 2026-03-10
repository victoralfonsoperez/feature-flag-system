import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SettingsModal from './SettingsModal';

const mockShowToast = vi.fn();
vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  localStorage.clear();
  mockShowToast.mockReset();
});

afterEach(cleanup);

describe('SettingsModal', () => {
  it('renders API URL and Bearer Token fields', () => {
    render(<SettingsModal onClose={() => {}} />);
    expect(screen.getByLabelText('API Base URL')).toBeDefined();
    expect(screen.getByLabelText('Bearer Token')).toBeDefined();
  });

  it('loads saved settings from localStorage', () => {
    localStorage.setItem('ff-dashboard-settings', JSON.stringify({
      apiUrl: 'https://api.example.com',
      apiToken: 'my-token',
    }));
    render(<SettingsModal onClose={() => {}} />);
    expect((screen.getByLabelText('API Base URL') as HTMLInputElement).value).toBe('https://api.example.com');
    expect((screen.getByLabelText('Bearer Token') as HTMLInputElement).value).toBe('my-token');
  });

  it('saves settings to localStorage on save', () => {
    const onClose = vi.fn();
    render(<SettingsModal onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('API Base URL'), { target: { value: 'https://my-api.com' } });
    fireEvent.change(screen.getByLabelText('Bearer Token'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Save'));

    const saved = JSON.parse(localStorage.getItem('ff-dashboard-settings')!);
    expect(saved.apiUrl).toBe('https://my-api.com');
    expect(saved.apiToken).toBe('secret');
    expect(mockShowToast).toHaveBeenCalledWith('Settings saved', 'success');
    expect(onClose).toHaveBeenCalled();
  });

  it('saves empty settings when fields are blank', () => {
    render(<SettingsModal onClose={() => {}} />);
    fireEvent.click(screen.getByText('Save'));
    const saved = JSON.parse(localStorage.getItem('ff-dashboard-settings')!);
    expect(saved.apiUrl).toBeUndefined();
    expect(saved.apiToken).toBeUndefined();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsModal onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<SettingsModal onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
