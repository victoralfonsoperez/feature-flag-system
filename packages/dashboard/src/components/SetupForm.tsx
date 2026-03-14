import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { setup } from '../api';
import { useAuth } from '../auth/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import FormInput from './FormInput';
import type { InputStatus } from './FormInput';

const strengthColors = { weak: 'bg-red-500', fair: 'bg-amber-500', strong: 'bg-green-500' };
const strengthWidths = { weak: 'w-1/3', fair: 'w-2/3', strong: 'w-full' };

export default function SetupForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);

  const emailStatus: InputStatus =
    !emailTouched ? 'idle' : emailResult.valid ? 'success' : 'error';

  const passwordStatus: InputStatus =
    !passwordTouched ? 'idle' : passwordResult.valid ? 'success' : 'warning';

  const formValid = emailResult.valid && passwordResult.valid;

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    [],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (!passwordTouched) setPasswordTouched(true);
    },
    [passwordTouched],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);
    try {
      await setup(email, password);
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-lg border border-gray-700 p-8">
        <h1 className="text-xl font-semibold text-gray-100 mb-2">Create Admin Account</h1>
        <p className="text-sm text-gray-400 mb-6">Set up the first admin user to get started.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={() => setEmailTouched(true)}
            status={emailStatus}
            messages={
              emailTouched && !emailResult.valid
                ? [{ text: emailResult.message, type: 'error' }]
                : []
            }
          />

          <div>
            <FormInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              status={passwordStatus}
            />

            {passwordTouched && (
              <>
                {/* Strength bar */}
                <div className="mt-2 h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${strengthWidths[passwordResult.strength]} ${strengthColors[passwordResult.strength]}`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  {passwordResult.strength}
                </p>

                {/* Requirements checklist */}
                <ul className="mt-2 space-y-0.5">
                  {passwordResult.messages.map((r) => (
                    <li
                      key={r.rule}
                      className={`text-xs flex items-center gap-1 ${r.passed ? 'text-green-400' : 'text-gray-500'}`}
                    >
                      <span>{r.passed ? '\u2713' : '\u2022'}</span>
                      {r.rule}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!formValid || loading}
            className="w-full bg-yellow-500 text-gray-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
