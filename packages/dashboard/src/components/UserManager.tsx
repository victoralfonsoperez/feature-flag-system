import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getUsers, createUser, deleteUser } from '../api';
import type { User } from '../api';
import { useAuth } from '../auth/AuthContext';
import FormInput from './FormInput';
import type { InputStatus } from './FormInput';
import { validateEmail, validatePassword } from '../utils/validation';

export default function UserManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  const emailStatus: InputStatus =
    !emailTouched || !email ? 'idle' : emailValidation.valid ? 'success' : 'error';
  const passwordStatus: InputStatus =
    !passwordTouched || !password
      ? 'idle'
      : passwordValidation.valid
        ? 'success'
        : passwordValidation.strength === 'fair'
          ? 'warning'
          : 'error';

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!emailValidation.valid || !passwordValidation.valid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    try {
      await createUser(email, password, role);
      setEmail('');
      setPassword('');
      setRole('viewer');
      setEmailTouched(false);
      setPasswordTouched(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>

      <form onSubmit={handleCreate} className="mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormInput
            id="user-email"
            label="Email"
            type="email"
            placeholder="user@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            status={emailStatus}
            messages={
              emailTouched && !emailValidation.valid
                ? [{ text: emailValidation.message, type: 'error' as const }]
                : undefined
            }
          />
          <FormInput
            id="user-password"
            label="Password"
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            status={passwordStatus}
            messages={
              passwordTouched && password
                ? passwordValidation.messages
                    .filter((m) => !m.passed)
                    .map((m) => ({ text: m.rule, type: 'error' as const }))
                : undefined
            }
          />
          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Create User
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-sm">No users found.</p>
      ) : (
        <table className="w-full bg-white rounded-lg border border-gray-200">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-medium">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500 capitalize">{u.role}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.created_at}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
