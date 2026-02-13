import { useEffect, useRef } from 'react';
import type { Attachment, ChatMessage } from '../types';
import { formatTimestamp, formatTimestampFull, parseMessageBody, avatarColor, avatarInitial } from '../lib/utils';

interface Props {
  messages: ChatMessage[];
  blocked: Set<string>;
  onBlock: (author: string) => void;
}

export function MessageList({ messages, blocked, onBlock }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="messages-empty">
        <div className="messages-empty-icon">#</div>
        <h2>Welcome to #general</h2>
        <p>This is the start of the channel. Send a message to get the conversation going.</p>
      </div>
    );
  }

  return (
    <div className="messages-scroll">
      <ul className="message-list">
        {messages.map(message => (
          <MessageRow
            key={message.id}
            message={message}
            onBlock={onBlock}
            isBlocked={blocked.has(message.author)}
          />
        ))}
      </ul>
      <div ref={bottomRef} />
    </div>
  );
}

function MessageRow({
  message,
  onBlock,
  isBlocked,
}: {
  message: ChatMessage;
  onBlock: (author: string) => void;
  isBlocked: boolean;
}) {
  const parts = parseMessageBody(message.body);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.body);
  };

  return (
    <li className="message-row">
      <div className="message-avatar" style={{ backgroundColor: avatarColor(message.author) }} title={message.author}>
        {avatarInitial(message.author)}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">{message.author}</span>
          <span className="message-time" title={formatTimestampFull(message.timestamp)}>
            {formatTimestamp(message.timestamp)}
          </span>
          <button type="button" className="message-copy" onClick={handleCopy} title="Copy message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {!isBlocked && (
            <button
              type="button"
              className="message-block"
              onClick={() => onBlock(message.author)}
              title="Block this user (hide their messages for you)"
            >
              Block
            </button>
          )}
        </div>
        <div className="message-body">
          {parts.map((part, i) => {
            if (part.type === 'text') return <span key={i}>{part.content}</span>;
            if (part.type === 'bold') return <strong key={i}>{part.content}</strong>;
            if (part.type === 'italic') return <em key={i}>{part.content}</em>;
            if (part.type === 'code') return <code key={i} className="inline-code">{part.content}</code>;
            return null;
          })}
        </div>
        {message.attachments?.length ? (
          <div className="message-attachments">
            {message.attachments.map((att, i) => (
              <AttachmentBlock key={i} att={att} />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function AttachmentBlock({ att }: { att: Attachment }) {
  const dataUrl = `data:${att.content_type};base64,${att.data_base64}`;
  const isImage = att.content_type.startsWith('image/');
  const isAudio = att.content_type.startsWith('audio/');
  const isVideo = att.content_type.startsWith('video/');

  if (isImage) {
    return (
      <div className="message-attach message-attach--image">
        <a href={dataUrl} target="_blank" rel="noopener noreferrer">
          <img src={dataUrl} alt={att.filename} />
        </a>
      </div>
    );
  }
  if (isAudio) {
    return (
      <div className="message-attach message-attach--audio">
        <audio controls src={dataUrl} preload="metadata" />
        <span className="message-attach-filename">{att.filename}</span>
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className="message-attach message-attach--video">
        <video controls src={dataUrl} preload="metadata" />
        <span className="message-attach-filename">{att.filename}</span>
      </div>
    );
  }
  return (
    <div className="message-attach message-attach--file">
      <a href={dataUrl} download={att.filename} className="message-attach-download">
        📎 {att.filename}
      </a>
    </div>
  );
}
