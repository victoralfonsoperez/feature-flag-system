import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateFlagInput, Environment } from '../types';
import FormInput from './FormInput';
import type { InputStatus } from './FormInput';
import { useToast } from './Toast';

type CreateFlagFormProps = {
  onSubmit: (input: CreateFlagInput) => Promise<void>;
};

const FLAG_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ENVIRONMENTS: Environment[] = ['production', 'staging', 'development'];
const FLAG_TYPES: CreateFlagInput['type'][] = ['runtime', 'build-time'];

function validateKey(key: string): { valid: boolean; message: string } {
  if (!key) return { valid: false, message: 'Key is required' };
  if (key.includes(' ')) return { valid: false, message: 'Key cannot contain spaces' };
  if (!FLAG_KEY_PATTERN.test(key)) return { valid: false, message: 'Key must be alphanumeric with dashes or underscores' };
  return { valid: true, message: '' };
}

export default function CreateFlagForm({ onSubmit }: CreateFlagFormProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<CreateFlagInput['type']>('runtime');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();
  const [keyTouched, setKeyTouched] = useState(false);
  const [valueTouched, setValueTouched] = useState(false);

  const keyValidation = validateKey(key);
  const keyStatus: InputStatus =
    !keyTouched || !key ? 'idle' : keyValidation.valid ? 'success' : 'error';
  const valueStatus: InputStatus =
    !valueTouched || value ? 'idle' : 'error';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setKeyTouched(true);
    setValueTouched(true);

    if (!keyValidation.valid || !value) return;

    setSubmitting(true);
    try {
      await onSubmit({ key, value, type, environment, description: description || undefined });
      setKey('');
      setValue('');
      setType('runtime');
      setEnvironment('production');
      setDescription('');
      setKeyTouched(false);
      setValueTouched(false);
      showToast(`Flag "${key}" created`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create flag';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-700 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-100 mb-3">Create Flag</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <FormInput
          id="flag-key"
          label="Key"
          placeholder="my-feature-flag"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onBlur={() => setKeyTouched(true)}
          status={keyStatus}
          messages={
            keyTouched && !keyValidation.valid
              ? [{ text: keyValidation.message, type: 'error' as const }]
              : undefined
          }
        />
        <FormInput
          id="flag-value"
          label="Value"
          placeholder="true"
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
          <label htmlFor="flag-type" className="block text-sm font-medium text-gray-300 mb-1">
            Type
          </label>
          <select
            id="flag-type"
            value={type}
            onChange={(e) => setType(e.target.value as CreateFlagInput['type'])}
            className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FLAG_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="flag-environment" className="block text-sm font-medium text-gray-300 mb-1">
            Environment
          </label>
          <select
            id="flag-environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>
      </div>

      {type === 'build-time' && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-300 text-sm rounded-md px-3 py-2 mb-3">
          ⚠ Build-time flags require a rebuild to take effect. If GitHub integration is configured, a rebuild is triggered automatically.
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="flag-description" className="block text-sm font-medium text-gray-300 mb-1">
          Description
        </label>
        <input
          id="flag-description"
          type="text"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating...' : 'Create Flag'}
      </button>
    </form>
  );
}
