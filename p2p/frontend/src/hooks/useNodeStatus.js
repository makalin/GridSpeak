import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../lib/api';
export function useNodeStatus(pollMs = 5000) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timer = useRef();
    const refresh = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/status`);
            if (!response.ok) {
                throw new Error(`Failed to fetch status (${response.status})`);
            }
            const payload = await response.json();
            setStatus({
                peer_id: payload.peer_id ?? '',
                peers: payload.peers ?? [],
                messageCount: payload.message_count ?? 0,
                lastMessage: payload.last_message ?? null,
            });
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
    return { status, loading, error, refresh };
}
