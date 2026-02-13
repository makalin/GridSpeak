import { useCallback, useState } from 'react';
import { addBlocked as add, removeBlocked as remove, getBlocked } from '../lib/blocklist';

export function useBlocklist() {
  const [blocked, setBlocked] = useState<Set<string>>(() => getBlocked());

  const refresh = useCallback(() => {
    setBlocked(getBlocked());
  }, []);

  const block = useCallback((author: string) => {
    add(author);
    setBlocked(getBlocked());
  }, []);

  const unblock = useCallback((author: string) => {
    remove(author);
    setBlocked(getBlocked());
  }, []);

  return { blocked, block, unblock };
}
