import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { validateEmail } from '../utils/validation';
import FormInput from './FormInput';
import type { InputStatus } from './FormInput';

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);

  const emailResult = validateEmail(email);

  const emailStatus: InputStatus =
    !emailTouched ? 'idle' : emailResult.valid ? 'success' : 'error';

  const formValid = emailResult.valid && password.length > 0;

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    [],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-lg border border-gray-700 p-8">
        <h1 className="text-xl font-semibold text-gray-100 mb-6">Sign In</h1>
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

          <FormInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            status="idle"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!formValid || loading}
            className="w-full bg-yellow-500 text-gray-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
