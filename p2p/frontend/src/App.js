import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Composer } from './components/Composer';
import { MessageList } from './components/MessageList';
import { StatusPanel } from './components/StatusPanel';
import { Sidebar } from './components/Sidebar';
import { ChannelHeader } from './components/ChannelHeader';
import { MemberList } from './components/MemberList';
import { VoiceVideoPanel } from './components/VoiceVideoPanel';
import { useMessages } from './hooks/useMessages';
import { useNodeStatus } from './hooks/useNodeStatus';
import { useBlocklist } from './hooks/useBlocklist';
const NICKNAME_KEY = 'gridspeak-nickname';
function getCurrentNickname() {
    if (typeof localStorage === 'undefined')
        return '';
    return localStorage.getItem(NICKNAME_KEY) ?? '';
}
export default function App() {
    const { messages, loading, error, sendMessage } = useMessages();
    const { status, loading: statusLoading, error: statusError, refresh: refreshStatus } = useNodeStatus();
    const currentUser = getCurrentNickname();
    const memberCount = (status?.peers.length ?? 0) + (currentUser ? 1 : 0);
    const { blocked, block, unblock } = useBlocklist();
    const visibleMessages = messages.filter(m => !blocked.has(m.author));
    return (_jsxs("div", { className: "app-shell", children: [_jsx(Sidebar, {}), _jsxs("main", { className: "main-panel", children: [_jsx(ChannelHeader, { channelName: "general", memberCount: memberCount }), _jsx("div", { className: "main-content", children: _jsxs("div", { className: "channel-area", children: [_jsx(StatusPanel, { status: status, loading: statusLoading, error: statusError, onRefresh: refreshStatus }), _jsx(VoiceVideoPanel, { status: status }), error && _jsx("div", { className: "banner error", children: error }), loading && _jsx("div", { className: "banner", children: "Syncing message history\u2026" }), _jsx("section", { className: "messages-section", children: _jsx(MessageList, { messages: visibleMessages, blocked: blocked, onBlock: block }) }), _jsx("section", { className: "composer-section", children: _jsx(Composer, { onSend: sendMessage }) })] }) })] }), _jsx(MemberList, { peers: status?.peers ?? [], currentUser: currentUser || null, blocked: blocked, onUnblock: unblock })] }));
}
