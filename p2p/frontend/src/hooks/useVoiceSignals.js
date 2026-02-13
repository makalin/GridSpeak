import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../lib/api';
export function useVoiceSignals(pollMs = 1500) {
    const [signals, setSignals] = useState([]);
    const timer = useRef();
    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/voice/signals`);
            if (res.ok) {
                const data = await res.json();
                setSignals(Array.isArray(data) ? data : []);
            }
        }
        catch {
            // ignore
        }
    }, []);
    useEffect(() => {
        refresh();
        timer.current = window.setInterval(refresh, pollMs);
        return () => {
            if (timer.current)
                clearInterval(timer.current);
        };
    }, [pollMs, refresh]);
    const sendSignal = useCallback(async (kind, data, to) => {
        await fetch(`${API_BASE}/voice/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: kind, data, to: to || null }),
        });
    }, []);
    return { signals, refresh, sendSignal };
}
