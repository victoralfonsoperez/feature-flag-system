import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import VariantEditor from './VariantEditor';
import type { Variant } from '../types';

afterEach(cleanup);

const twoVariants: Variant[] = [
  { name: 'control', value: 'off', weight: 50 },
  { name: 'treatment', value: 'on', weight: 50 },
];

describe('VariantEditor', () => {
  it('renders existing variants', () => {
    render(<VariantEditor variants={twoVariants} onChange={() => {}} />);
    expect((screen.getByLabelText('Variant 1 name') as HTMLInputElement).value).toBe('control');
    expect((screen.getByLabelText('Variant 1 value') as HTMLInputElement).value).toBe('off');
    expect((screen.getByLabelText('Variant 1 weight') as HTMLInputElement).value).toBe('50');
    expect((screen.getByLabelText('Variant 2 name') as HTMLInputElement).value).toBe('treatment');
  });

  it('add variant button appends a new empty variant', () => {
    const onChange = vi.fn();
    render(<VariantEditor variants={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add Variant'));
    expect(onChange).toHaveBeenCalledWith([{ name: '', value: '', weight: 0 }]);
  });

  it('remove variant removes the correct row', () => {
    const onChange = vi.fn();
    render(<VariantEditor variants={twoVariants} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Remove variant 1'));
    expect(onChange).toHaveBeenCalledWith([twoVariants[1]]);
  });

  it('move up swaps variant with previous', () => {
    const onChange = vi.fn();
    render(<VariantEditor variants={twoVariants} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Move variant 2 up'));
    expect(onChange).toHaveBeenCalledWith([twoVariants[1], twoVariants[0]]);
  });

  it('move down swaps variant with next', () => {
    const onChange = vi.fn();
    render(<VariantEditor variants={twoVariants} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Move variant 1 down'));
    expect(onChange).toHaveBeenCalledWith([twoVariants[1], twoVariants[0]]);
  });

  it('move up is disabled for first variant', () => {
    render(<VariantEditor variants={twoVariants} onChange={() => {}} />);
    expect((screen.getByLabelText('Move variant 1 up') as HTMLButtonElement).disabled).toBe(true);
  });

  it('move down is disabled for last variant', () => {
    render(<VariantEditor variants={twoVariants} onChange={() => {}} />);
    expect((screen.getByLabelText('Move variant 2 down') as HTMLButtonElement).disabled).toBe(true);
  });

  it('input changes propagate via onChange', () => {
    const onChange = vi.fn();
    render(<VariantEditor variants={twoVariants} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Variant 1 name'), { target: { value: 'updated' } });
    expect(onChange).toHaveBeenCalledWith([
      { name: 'updated', value: 'off', weight: 50 },
      twoVariants[1],
    ]);
  });

  it('weight input parses as integer', () => {
    const onChange = vi.fn();
    render(<VariantEditor variants={twoVariants} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Variant 1 weight'), { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith([
      { name: 'control', value: 'off', weight: 75 },
      twoVariants[1],
    ]);
  });

  it('displays error message when provided', () => {
    render(<VariantEditor variants={[]} onChange={() => {}} errors="Weights must be positive" />);
    expect(screen.getByText('Weights must be positive')).toBeDefined();
  });

  it('does not display error when not provided', () => {
    render(<VariantEditor variants={[]} onChange={() => {}} />);
    expect(screen.queryByText('Weights must be positive')).toBeNull();
  });
});
