import { useState } from 'react';
import type { User } from '../App';

type Props = {
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
};

export function LoginScreen({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { username, password };
      if (mode === 'register' && displayName.trim()) body.display_name = displayName.trim();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      if (mode === 'login') onLogin(data);
      else onRegister(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">GridSpeak</h1>
        <p className="login-subtitle">Discord-like chat</p>
        <form onSubmit={submit} className="login-form">
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          {mode === 'register' && (
            <input type="text" placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          )}
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? '…' : mode === 'login' ? 'Log in' : 'Register'}</button>
        </form>
        <p className="login-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Register' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
