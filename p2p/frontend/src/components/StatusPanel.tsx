import type { NodeStatus } from '../types';

interface Props {
  status: NodeStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function StatusPanel({ status, loading, error, onRefresh }: Props) {
  return (
    <section className="status-panel">
      <div className="status-header">
        <div>
          <h2>Node Status</h2>
          <p>{loading ? 'Syncing…' : 'Local view of the mesh'}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div className="banner error compact">{error}</div>}

      <div className="status-grid">
        <div>
          <span className="label">Messages synced</span>
          <strong>{status?.messageCount ?? 0}</strong>
        </div>
        <div>
          <span className="label">Peers online</span>
          <strong>{status?.peers.length ?? 0}</strong>
        </div>
        <div>
          <span className="label">Last message</span>
          <strong>
            {status?.lastMessage
              ? new Date(status.lastMessage).toLocaleString()
              : '—'}
          </strong>
        </div>
      </div>

      <div className="peer-list">
        <span className="label">Active peers</span>
        {status?.peers.length ? (
          <ul>
            {status.peers.map(peer => (
              <li key={peer}>{peer}</li>
            ))}
          </ul>
        ) : (
          <p>No peers discovered yet.</p>
        )}
      </div>
    </section>
  );
}
