import { avatarColor, avatarInitial, shortenPeerId } from '../lib/utils';

interface Props {
  peers: string[];
  currentUser?: string | null;
  blocked?: Set<string>;
  onUnblock?: (author: string) => void;
}

/** Discord-like right sidebar: online members + blocked users */
export function MemberList({ peers, currentUser, blocked = new Set(), onUnblock }: Props) {
  const peerList = Array.from(new Set(peers)).sort();
  const hasCurrent = Boolean(currentUser?.trim());
  const totalOnline = peerList.length + (hasCurrent ? 1 : 0);

  return (
    <aside className="member-list">
      <div className="member-list-header">
        <span className="label">Online — {totalOnline}</span>
      </div>
      {peerList.length === 0 && totalOnline > 0 && (
        <p className="member-list-hint">No other nodes connected. Run another node on the same network, or add its address to bootstrap_nodes in config.</p>
      )}
      <ul className="member-list-items">
        {hasCurrent && (
          <li className="member-item member-item--you">
            <span className="member-avatar" style={{ backgroundColor: avatarColor(currentUser!) }}>
              {avatarInitial(currentUser!)}
            </span>
            <span className="member-name">{currentUser}</span>
            <span className="member-badge">You</span>
          </li>
        )}
        {peerList.map(peer => (
          <li key={peer} className="member-item" title={peer}>
            <span className="member-avatar" style={{ backgroundColor: avatarColor(peer) }}>
              {avatarInitial(peer)}
            </span>
            <span className="member-status" title="Online" />
            <span className="member-name">{shortenPeerId(peer)}</span>
          </li>
        ))}
      </ul>
      {peerList.length === 0 && !hasCurrent && (
        <p className="member-list-empty">No other peers online. Invite others to join your grid.</p>
      )}

      {blocked.size > 0 && (
        <div className="blocked-section">
          <div className="member-list-header">
            <span className="label">Blocked — {blocked.size}</span>
          </div>
          <ul className="member-list-items">
            {Array.from(blocked).map(author => (
              <li key={author} className="member-item">
                <span className="member-avatar" style={{ backgroundColor: avatarColor(author) }}>
                  {avatarInitial(author)}
                </span>
                <span className="member-name">{author}</span>
                {onUnblock && (
                  <button
                    type="button"
                    className="member-unblock"
                    onClick={() => onUnblock(author)}
                    title="Unblock"
                  >
                    Unblock
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
