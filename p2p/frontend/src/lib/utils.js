/**
 * Discord-like utility functions
 */
/** Relative time (e.g. "2m ago", "Today at 3:42 PM") */
export function formatTimestamp(iso) {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24 && d >= today)
        return `Today at ${timeStr}`;
    if (d >= yesterday && d < today)
        return `Yesterday at ${timeStr}`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) + ' at ' + timeStr;
}
/** Full date/time for tooltips */
export function formatTimestampFull(iso) {
    return new Date(iso).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
/** Parse Discord-style formatting: *bold*, _italic_, `code` into parts for rendering */
export function parseMessageBody(text) {
    const parts = [];
    let remaining = text;
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: remaining.slice(lastIndex, match.index) });
        }
        const raw = match[1];
        if (raw.startsWith('**') && raw.endsWith('**')) {
            parts.push({ type: 'bold', content: raw.slice(2, -2) });
        }
        else if (raw.startsWith('*') && raw.endsWith('*')) {
            parts.push({ type: 'italic', content: raw.slice(1, -1) });
        }
        else if (raw.startsWith('__') && raw.endsWith('__')) {
            parts.push({ type: 'bold', content: raw.slice(2, -2) });
        }
        else if (raw.startsWith('_') && raw.endsWith('_') && raw.length > 2) {
            parts.push({ type: 'italic', content: raw.slice(1, -1) });
        }
        else if (raw.startsWith('`') && raw.endsWith('`')) {
            parts.push({ type: 'code', content: raw.slice(1, -1) });
        }
        else {
            parts.push({ type: 'text', content: raw });
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < remaining.length) {
        parts.push({ type: 'text', content: remaining.slice(lastIndex) });
    }
    return parts.length ? parts : [{ type: 'text', content: text }];
}
/** Avatar color from string (consistent per user) */
export function avatarColor(name) {
    const colors = [
        '#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245',
        '#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++)
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
}
/** Initial for avatar (first letter of name, or "?") */
export function avatarInitial(name) {
    const t = name.trim();
    return t ? t[0].toUpperCase() : '?';
}
/** Shorten peer ID for display (e.g. "12D3KooW…") */
export function shortenPeerId(peerId, maxLen = 12) {
    if (peerId.length <= maxLen)
        return peerId;
    return peerId.slice(0, maxLen - 1) + '…';
}
