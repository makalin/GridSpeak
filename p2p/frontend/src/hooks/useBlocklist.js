import { useCallback, useState } from 'react';
import { addBlocked as add, removeBlocked as remove, getBlocked } from '../lib/blocklist';
export function useBlocklist() {
    const [blocked, setBlocked] = useState(() => getBlocked());
    const refresh = useCallback(() => {
        setBlocked(getBlocked());
    }, []);
    const block = useCallback((author) => {
        add(author);
        setBlocked(getBlocked());
    }, []);
    const unblock = useCallback((author) => {
        remove(author);
        setBlocked(getBlocked());
    }, []);
    return { blocked, block, unblock };
}
