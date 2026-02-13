import { useState } from 'react';

interface Props {
  channels: string[];
  currentChannel: string;
  onSelectChannel: (name: string) => void;
  onCreateChannel: (name: string) => Promise<void>;
  onDeleteChannel: (name: string) => Promise<void>;
}

/** Discord-like server/channel sidebar */
export function Sidebar({ channels, currentChannel, onSelectChannel, onCreateChannel, onDeleteChannel }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = newChannelName.trim().toLowerCase();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await onCreateChannel(name);
      setNewChannelName('');
      setShowCreate(false);
      onSelectChannel(name);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-server">
        <div className="server-icon" title="GridSpeak">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45v6.9L12 18.82l-6.9-3.45v-6.9L12 4.18z" />
          </svg>
        </div>
        <span className="server-name">GridSpeak</span>
      </div>
      <nav className="sidebar-channels">
        <div className="channels-header">
          <span className="channels-dropdown">Channels</span>
          <button
            type="button"
            className="channel-create-btn"
            onClick={() => setShowCreate(!showCreate)}
            title="Create channel"
            aria-label="Create channel"
          >
            +
          </button>
        </div>
        {showCreate && (
          <div className="channel-create-form">
            <input
              type="text"
              placeholder="Channel name (e.g. random)"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              maxLength={64}
            />
            <div className="channel-create-actions">
              <button type="button" onClick={handleCreate} disabled={creating || !newChannelName.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}>Cancel</button>
            </div>
            {createError && <p className="channel-create-error">{createError}</p>}
          </div>
        )}
        <ul className="channel-list">
          {channels.map(ch => (
            <li
              key={ch}
              className={`channel-item ${ch === currentChannel ? 'channel-item--active' : ''}`}
              onClick={() => onSelectChannel(ch)}
            >
              <span className="channel-icon">#</span>
              <span className="channel-name">{ch}</span>
              {ch !== 'general' && (
                <button
                  type="button"
                  className="channel-delete-btn"
                  title="Delete channel"
                  aria-label={`Delete ${ch}`}
                  onClick={e => {
                    e.stopPropagation();
                    if (deleting === ch) return;
                    if (!window.confirm(`Delete #${ch}? Messages in this channel will be lost.`)) return;
                    setDeleting(ch);
                    onDeleteChannel(ch).finally(() => setDeleting(null));
                  }}
                  disabled={deleting !== null}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="sidebar-voice">
          <span className="label">Voice & Video</span>
          <p className="sidebar-voice-coming">Join in the channel area below</p>
        </div>
      </nav>
    </aside>
  );
}
