import { useState, useEffect } from 'react';
import type { User } from '../App';
import { ServerSidebar } from './ServerSidebar';
import { ChannelView } from './ChannelView';
import { MemberList } from './MemberList';

type Server = { id: number; name: string; owner_id: number };
type Channel = { id: number; server_id: number; name: string; type: string };

type Props = {
  user: User;
  onLogout: () => void;
};

export function MainApp({ user, onLogout }: Props) {
  const [servers, setServers] = useState<Server[]>([]);
  const [currentServer, setCurrentServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchServers() {
    const res = await fetch('/api/servers', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setServers(data);
    if (data.length > 0 && !currentServer) setCurrentServer(data[0]);
    else if (currentServer && !data.find((s: Server) => s.id === currentServer.id)) setCurrentServer(data[0] ?? null);
  }

  async function fetchChannels(serverId: number) {
    const res = await fetch(`/api/servers/${serverId}/channels`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setChannels(data);
    if (data.length > 0 && (!currentChannel || currentChannel.server_id !== serverId)) setCurrentChannel(data[0]);
    else if (currentChannel && currentChannel.server_id === serverId && !data.find((c: Channel) => c.id === currentChannel.id)) setCurrentChannel(data[0] ?? null);
  }

  useEffect(() => {
    (async () => {
      await fetchServers();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (currentServer) fetchChannels(currentServer.id);
  }, [currentServer?.id]);

  useEffect(() => {
    if (currentServer && channels.length > 0 && (!currentChannel || currentChannel.server_id !== currentServer.id)) {
      setCurrentChannel(channels[0]);
    }
  }, [currentServer, channels]);

  async function createServer(name: string) {
    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create server');
    const server = await res.json();
    await fetchServers();
    setCurrentServer(server);
  }

  async function createChannel(name: string) {
    if (!currentServer) return;
    const res = await fetch(`/api/servers/${currentServer.id}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create channel');
    await fetchChannels(currentServer.id);
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ServerSidebar
        servers={servers}
        currentServer={currentServer}
        onSelectServer={setCurrentServer}
        onCreateServer={createServer}
        channels={channels}
        currentChannel={currentChannel}
        onSelectChannel={setCurrentChannel}
        onCreateChannel={createChannel}
        user={user}
        onLogout={onLogout}
      />
      {currentChannel ? (
        <ChannelView channel={currentChannel} serverName={currentServer?.name ?? ''} />
      ) : (
        <main className="main-panel">
          <div className="welcome-placeholder">
            <p>Select a channel</p>
          </div>
        </main>
      )}
      <MemberList serverId={currentServer?.id ?? 0} />
    </div>
  );
}
