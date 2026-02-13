import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../lib/api';

async function getChannels(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/channels`);
  if (!response.ok) {
    throw new Error(`Failed to fetch channels (${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function createChannel(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to create channel (${response.status})`);
  }
}

async function deleteChannel(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/channels/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to delete channel (${response.status})`);
  }
}

export function useChannels(pollMs = 5000) {
  const [channels, setChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();

  const refresh = useCallback(async () => {
    try {
      const data = await getChannels();
      setChannels(data);
      setError(null);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      setError(reason);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = window.setInterval(refresh, pollMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pollMs, refresh]);

  const addChannel = useCallback(
    async (name: string) => {
      await createChannel(name);
      await refresh();
    },
    [refresh]
  );

  const removeChannel = useCallback(
    async (name: string) => {
      await deleteChannel(name);
      await refresh();
    },
    [refresh]
  );

  return { channels, loading, error, refresh, addChannel, removeChannel };
}
