import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, MessageComposerPayload } from '../types';
import { API_BASE } from '../lib/api';

async function getMessages(channel: string): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ channel });
  const response = await fetch(`${API_BASE}/messages?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages (${response.status})`);
  }
  return response.json();
}

async function postMessage(channel: string, payload: MessageComposerPayload): Promise<void> {
  const response = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, channel }),
  });
  if (!response.ok) {
    throw new Error('Unable to deliver message');
  }
}

export function useMessages(channel: string, pollMs = 3000) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();

  const refresh = useCallback(async () => {
    if (!channel) {
      setMessages([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getMessages(channel);
      setMessages(data);
      setError(null);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      setError(reason);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    refresh();
    timer.current = window.setInterval(refresh, pollMs);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [pollMs, refresh]);

  const sendMessage = useCallback(
    async (body: string, author?: string, attachments?: MessageComposerPayload['attachments']) => {
      await postMessage(channel, { body, author, attachments });
      await refresh();
    },
    [channel, refresh]
  );

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [messages]
  );

  return { messages: sortedMessages, loading, error, sendMessage };
}
