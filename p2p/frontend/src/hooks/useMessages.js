import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../lib/api';
async function getMessages() {
    const response = await fetch(`${API_BASE}/messages`);
    if (!response.ok) {
        throw new Error(`Failed to fetch messages (${response.status})`);
    }
    return response.json();
}
async function postMessage(payload) {
    const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error('Unable to deliver message');
    }
}
export function useMessages(pollMs = 3000) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timer = useRef();
    const refresh = useCallback(async () => {
        try {
            const data = await getMessages();
            setMessages(data);
            setError(null);
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : 'Unknown error';
            setError(reason);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh();
        timer.current = window.setInterval(refresh, pollMs);
        return () => {
            if (timer.current) {
                clearInterval(timer.current);
            }
        };
    }, [pollMs, refresh]);
    const sendMessage = useCallback(async (body, author, attachments) => {
        await postMessage({ body, author, attachments });
        await refresh();
    }, [refresh]);
    const sortedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [messages]);
    return { messages: sortedMessages, loading, error, sendMessage };
}
