import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { formatTimestamp, formatTimestampFull, parseMessageBody, avatarColor, avatarInitial } from '../lib/utils';
export function MessageList({ messages, blocked, onBlock }) {
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);
    if (!messages.length) {
        return (_jsxs("div", { className: "messages-empty", children: [_jsx("div", { className: "messages-empty-icon", children: "#" }), _jsx("h2", { children: "Welcome to #general" }), _jsx("p", { children: "This is the start of the channel. Send a message to get the conversation going." })] }));
    }
    return (_jsxs("div", { className: "messages-scroll", children: [_jsx("ul", { className: "message-list", children: messages.map(message => (_jsx(MessageRow, { message: message, onBlock: onBlock, isBlocked: blocked.has(message.author) }, message.id))) }), _jsx("div", { ref: bottomRef })] }));
}
function MessageRow({ message, onBlock, isBlocked, }) {
    const parts = parseMessageBody(message.body);
    const handleCopy = () => {
        navigator.clipboard.writeText(message.body);
    };
    return (_jsxs("li", { className: "message-row", children: [_jsx("div", { className: "message-avatar", style: { backgroundColor: avatarColor(message.author) }, title: message.author, children: avatarInitial(message.author) }), _jsxs("div", { className: "message-content", children: [_jsxs("div", { className: "message-header", children: [_jsx("span", { className: "message-author", children: message.author }), _jsx("span", { className: "message-time", title: formatTimestampFull(message.timestamp), children: formatTimestamp(message.timestamp) }), _jsx("button", { type: "button", className: "message-copy", onClick: handleCopy, title: "Copy message", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "14", height: "14", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }) }), !isBlocked && (_jsx("button", { type: "button", className: "message-block", onClick: () => onBlock(message.author), title: "Block this user (hide their messages for you)", children: "Block" }))] }), _jsx("div", { className: "message-body", children: parts.map((part, i) => {
                            if (part.type === 'text')
                                return _jsx("span", { children: part.content }, i);
                            if (part.type === 'bold')
                                return _jsx("strong", { children: part.content }, i);
                            if (part.type === 'italic')
                                return _jsx("em", { children: part.content }, i);
                            if (part.type === 'code')
                                return _jsx("code", { className: "inline-code", children: part.content }, i);
                            return null;
                        }) }), message.attachments?.length ? (_jsx("div", { className: "message-attachments", children: message.attachments.map((att, i) => (_jsx(AttachmentBlock, { att: att }, i))) })) : null] })] }));
}
function AttachmentBlock({ att }) {
    const dataUrl = `data:${att.content_type};base64,${att.data_base64}`;
    const isImage = att.content_type.startsWith('image/');
    const isAudio = att.content_type.startsWith('audio/');
    const isVideo = att.content_type.startsWith('video/');
    if (isImage) {
        return (_jsx("div", { className: "message-attach message-attach--image", children: _jsx("a", { href: dataUrl, target: "_blank", rel: "noopener noreferrer", children: _jsx("img", { src: dataUrl, alt: att.filename }) }) }));
    }
    if (isAudio) {
        return (_jsxs("div", { className: "message-attach message-attach--audio", children: [_jsx("audio", { controls: true, src: dataUrl, preload: "metadata" }), _jsx("span", { className: "message-attach-filename", children: att.filename })] }));
    }
    if (isVideo) {
        return (_jsxs("div", { className: "message-attach message-attach--video", children: [_jsx("video", { controls: true, src: dataUrl, preload: "metadata" }), _jsx("span", { className: "message-attach-filename", children: att.filename })] }));
    }
    return (_jsx("div", { className: "message-attach message-attach--file", children: _jsxs("a", { href: dataUrl, download: att.filename, className: "message-attach-download", children: ["\uD83D\uDCCE ", att.filename] }) }));
}
