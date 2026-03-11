import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Flag, UpdateFlagInput, Variant } from '../types';
import FormInput from './FormInput';
import type { InputStatus } from './FormInput';
import VariantEditor from './VariantEditor';

function parseVariants(raw: string | null): Variant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validateVariants(variants: Variant[]): string | undefined {
  if (variants.length === 0) return undefined;
  for (const v of variants) {
    if (v.weight < 1 || !Number.isInteger(v.weight)) {
      return 'All variant weights must be positive integers';
    }
  }
  return undefined;
}

type EditFlagModalProps = {
  flag: Flag;
  onSave: (key: string, input: UpdateFlagInput) => Promise<void>;
  onClose: () => void;
};

export default function EditFlagModal({ flag, onSave, onClose }: EditFlagModalProps) {
  const [value, setValue] = useState(flag.value);
  const [description, setDescription] = useState(flag.description);
  const [variants, setVariants] = useState<Variant[]>(() => parseVariants(flag.variants));
  const [variantError, setVariantError] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [valueTouched, setValueTouched] = useState(false);
  const valueStatus: InputStatus = !valueTouched || value ? 'idle' : 'error';

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setValueTouched(true);

    if (!value) return;

    const vErr = validateVariants(variants);
    if (vErr) {
      setVariantError(vErr);
      return;
    }
    setVariantError(undefined);

    setSaving(true);
    try {
      await onSave(flag.key, {
        value,
        description: description || undefined,
        variants: variants.length > 0 ? JSON.stringify(variants) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit flag ${flag.key}`}
    >
      <div className="bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">Edit Flag</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {flag.type === 'build-time' && (
          <div className="bg-amber-900/30 border border-amber-700 text-amber-300 text-sm rounded-md px-3 py-2 mb-4">
            ⚠ This is a build-time flag. Changes will not take effect until the app is rebuilt.
          </div>
        )}

        <p className="text-sm text-gray-400 mb-1">Key</p>
        <p className="font-mono text-sm text-gray-200 mb-4">{flag.key}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            id="edit-flag-value"
            label="Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setValueTouched(true)}
            status={valueStatus}
            messages={
              valueTouched && !value
                ? [{ text: 'Value is required', type: 'error' as const }]
                : undefined
            }
          />

          <div>
            <label htmlFor="edit-flag-description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <input
              id="edit-flag-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <VariantEditor variants={variants} onChange={setVariants} errors={variantError} />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-600 rounded-md hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
