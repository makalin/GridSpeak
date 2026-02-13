interface Props {
  channelName: string;
  memberCount: number;
}

/** Discord-like channel top bar */
export function ChannelHeader({ channelName, memberCount }: Props) {
  return (
    <header className="channel-header">
      <span className="channel-header-icon">#</span>
      <h1 className="channel-header-title">{channelName}</h1>
      <div className="channel-header-meta">
        <span className="channel-header-members">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
      </div>
      <div className="channel-header-actions">
        <button type="button" className="icon-btn" title="Search" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
        <button type="button" className="icon-btn" title="Members" aria-label="Members">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      </div>
    </header>
  );
}
