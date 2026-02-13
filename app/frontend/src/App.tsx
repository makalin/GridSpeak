import { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { MainApp } from './components/MainApp';

export type User = { id: number; username: string; display_name: string | null };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  function onLogout() {
    setUser(null);
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={(u) => setUser(u)}
        onRegister={(u) => setUser(u)}
      />
    );
  }

  return <MainApp user={user} onLogout={onLogout} />;
}
