import { Composer } from './components/Composer';
import { MessageList } from './components/MessageList';
import { StatusPanel } from './components/StatusPanel';
import { Sidebar } from './components/Sidebar';
import { ChannelHeader } from './components/ChannelHeader';
import { MemberList } from './components/MemberList';
import { VoiceVideoPanel } from './components/VoiceVideoPanel';
import { useState, useEffect } from 'react';
import { useMessages } from './hooks/useMessages';
import { useChannels } from './hooks/useChannels';
import { useNodeStatus } from './hooks/useNodeStatus';
import { useBlocklist } from './hooks/useBlocklist';

const NICKNAME_KEY = 'gridspeak-nickname';

function getCurrentNickname(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(NICKNAME_KEY) ?? '';
}

export default function App() {
  const [currentChannel, setCurrentChannel] = useState('general');
  const { channels, addChannel, removeChannel } = useChannels();

  useEffect(() => {
    if (channels.length > 0 && !channels.includes(currentChannel)) {
      setCurrentChannel(channels[0]);
    }
  }, [channels, currentChannel]);
  const { messages, loading, error, sendMessage } = useMessages(currentChannel);
  const { status, loading: statusLoading, error: statusError, refresh: refreshStatus } = useNodeStatus();
  const currentUser = getCurrentNickname();
  const memberCount = (status?.peers.length ?? 0) + (currentUser ? 1 : 0);
  const { blocked, block, unblock } = useBlocklist();
  const visibleMessages = messages.filter(m => !blocked.has(m.author));

  return (
    <div className="app-shell">
      <Sidebar
        channels={channels}
        currentChannel={currentChannel}
        onSelectChannel={setCurrentChannel}
        onCreateChannel={addChannel}
        onDeleteChannel={removeChannel}
      />
      <main className="main-panel">
        <ChannelHeader channelName={currentChannel} memberCount={memberCount} />
        <div className="main-content">
          <div className="channel-area">
            <StatusPanel
              status={status}
              loading={statusLoading}
              error={statusError}
              onRefresh={refreshStatus}
            />
            <VoiceVideoPanel status={status} />
            {error && <div className="banner error">{error}</div>}
            {loading && <div className="banner">Syncing message history…</div>}
            <section className="messages-section">
              <MessageList messages={visibleMessages} blocked={blocked} onBlock={block} />
            </section>
            <section className="composer-section">
              <Composer onSend={sendMessage} />
            </section>
          </div>
        </div>
      </main>
      <MemberList
        peers={status?.peers ?? []}
        currentUser={currentUser || null}
        blocked={blocked}
        onUnblock={unblock}
      />
    </div>
  );
}
