import { useState, useEffect, useRef } from 'react';

type Channel = { id: number; server_id: number; name: string; type: string };
type Message = {
  id: number;
  channel_id: number;
  content: string;
  created_at: string;
  author: { id: number; username: string; display_name: string | null };
};

type Props = {
  channel: Channel;
  serverName: string;
};

export function ChannelView({ channel, serverName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channel.id}/messages`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function sendMessage(content: string) {
    const res = await fetch(`/api/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to send');
    const msg = await res.json();
    setMessages((prev) => [...prev, msg]);
  }

  return (
    <main className="main-panel">
      <header className="channel-header">
        <span className="channel-hash">#</span>
        <span className="channel-title">{channel.name}</span>
        <span className="channel-server">{serverName}</span>
      </header>
      <div className="main-content">
        <div className="channel-area">
          {error && <div className="banner error">{error}</div>}
          {loading && <div className="banner">Loading messages…</div>}
          <section className="messages-section">
            {!loading && messages.length === 0 && (
              <div className="messages-empty">
                <div className="messages-empty-icon">#</div>
                <h2>Welcome to #{channel.name}</h2>
                <p>This is the start of the channel. Send a message to get the conversation going.</p>
              </div>
            )}
            {!loading && messages.length > 0 && (
              <div className="messages-scroll">
                <ul className="message-list">
                  {messages.map((m) => (
                    <li key={m.id} className="message-row">
                      <span className="message-avatar">{m.author.display_name?.slice(0, 1) || m.author.username.slice(0, 1)}</span>
                      <div className="message-body">
                        <span className="message-author">{m.author.display_name || m.author.username}</span>
                        <span className="message-time">{formatTime(m.created_at)}</span>
                        <p className="message-text">{m.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div ref={bottomRef} />
              </div>
            )}
          </section>
          <section className="composer-section">
            <Composer onSend={sendMessage} />
          </section>
        </div>
      </div>
    </main>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Composer({ onSend }: { onSend: (content: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await onSend(text);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e as any);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-inner">
        <div className="composer-input-wrap">
          <textarea
            placeholder="Type a message... (Enter to send)"
            value={content}
            rows={1}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={submitting}
          />
          <button type="submit" className="composer-send" disabled={submitting || !content.trim()} title="Send (Enter)">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
