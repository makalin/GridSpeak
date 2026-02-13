import { useState } from 'react';
import type { User } from '../App';

type Server = { id: number; name: string; owner_id: number };
type Channel = { id: number; server_id: number; name: string; type: string };

type Props = {
  servers: Server[];
  currentServer: Server | null;
  onSelectServer: (s: Server) => void;
  onCreateServer: (name: string) => Promise<void>;
  channels: Channel[];
  currentChannel: Channel | null;
  onSelectChannel: (c: Channel) => void;
  onCreateChannel: (name: string) => Promise<void>;
  user: User;
  onLogout: () => void;
};

export function ServerSidebar(props: Props) {
  const {
    servers,
    currentServer,
    onSelectServer,
    onCreateServer,
    channels,
    currentChannel,
    onSelectChannel,
    onCreateChannel,
    user,
    onLogout,
  } = props;
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateServer(e: React.FormEvent) {
    e.preventDefault();
    const name = newServerName.trim();
    if (!name) return;
    setCreateError(null);
    try {
      await onCreateServer(name);
      setNewServerName('');
      setShowAddServer(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    setCreateError(null);
    try {
      await onCreateChannel(name);
      setNewChannelName('');
      setShowAddChannel(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    onLogout();
  }

  return (
    <aside className="server-sidebar">
      <div className="server-list">
        {servers.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`server-pill ${currentServer?.id === s.id ? 'active' : ''}`}
            onClick={() => onSelectServer(s)}
            title={s.name}
          >
            {s.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
        <button type="button" className="server-pill add" onClick={() => setShowAddServer(true)} title="Add server">+</button>
      </div>
      {showAddServer && (
        <div className="sidebar-popover">
          <form onSubmit={handleCreateServer}>
            <input value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="Server name" autoFocus />
            <div className="popover-actions">
              <button type="submit">Create</button>
              <button type="button" onClick={() => { setShowAddServer(false); setCreateError(null); }}>Cancel</button>
            </div>
            {createError && <p className="error-text">{createError}</p>}
          </form>
        </div>
      )}
      <div className="channel-sidebar">
        {currentServer && (
          <>
            <div className="channel-sidebar-header">
              <span className="server-name">{currentServer.name}</span>
            </div>
            <nav className="channel-nav">
              <div className="channels-header">
                <span>Channels</span>
                <button type="button" className="icon-btn" onClick={() => setShowAddChannel(true)} title="Create channel">+</button>
              </div>
              {showAddChannel && (
                <form className="channel-create-inline" onSubmit={handleCreateChannel}>
                  <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Channel name" onKeyDown={(e) => e.key === 'Escape' && setShowAddChannel(false)} />
                  <div className="popover-actions">
                    <button type="submit">Create</button>
                    <button type="button" onClick={() => { setShowAddChannel(false); setCreateError(null); }}>Cancel</button>
                  </div>
                  {createError && <p className="error-text">{createError}</p>}
                </form>
              )}
              <ul className="channel-list">
                {channels.map((c) => (
                  <li
                    key={c.id}
                    className={currentChannel?.id === c.id ? 'active' : ''}
                    onClick={() => onSelectChannel(c)}
                  >
                    <span className="channel-icon">#</span>
                    <span className="channel-name">{c.name}</span>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
        <div className="user-bar">
          <button type="button" className="user-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
            <span className="user-avatar">{user.display_name?.slice(0, 1) || user.username.slice(0, 1)}</span>
            <span className="user-name">{user.display_name || user.username}</span>
          </button>
          {showUserMenu && (
            <div className="user-menu">
              <button type="button" onClick={doLogout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
