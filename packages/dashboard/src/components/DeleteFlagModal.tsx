import { useState, useEffect } from 'react';
import type { Flag } from '../types';

type DeleteFlagModalProps = {
  flag: Flag;
  onConfirm: (key: string) => Promise<void>;
  onClose: () => void;
};

export default function DeleteFlagModal({ flag, onConfirm, onClose }: DeleteFlagModalProps) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    setError('');
    setDeleting(true);
    try {
      await onConfirm(flag.key);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flag');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Delete flag ${flag.key}`}
    >
      <div className="bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">Delete Flag</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-6">
          Are you sure you want to delete <strong>{flag.key}</strong>?
        </p>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-600 rounded-md hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
