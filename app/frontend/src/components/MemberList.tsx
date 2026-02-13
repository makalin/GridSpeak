import { useState, useEffect } from 'react';

type Member = { id: number; username: string; display_name: string | null; role: string };

type Props = { serverId: number };

export function MemberList({ serverId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!serverId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/servers/${serverId}/members`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => { if (!cancelled) setMembers(data); })
      .catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [serverId]);

  return (
    <aside className="member-list">
      <div className="member-list-header">Members — {members.length}</div>
      <ul className="member-list-items">
        {members.map((m) => (
          <li key={m.id} className="member-item">
            <span className="member-avatar">{m.display_name?.slice(0, 1) || m.username.slice(0, 1)}</span>
            <span className="member-name">{m.display_name || m.username}</span>
            {m.role === 'owner' && <span className="member-role">owner</span>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
