import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
const NICKNAME_KEY = 'gridspeak-nickname';
const MAX_TOTAL_ATTACHMENT_BYTES = 400 * 1024; // ~400 KB to stay under backend 512 KB
function fileToAttachment(file) {
    return new Promise((resolve) => {
        if (file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const data = reader.result.split(',')[1];
            if (!data) {
                resolve(null);
                return;
            }
            resolve({
                content_type: file.type || 'application/octet-stream',
                filename: file.name,
                data_base64: data,
            });
        };
        reader.readAsDataURL(file);
    });
}
export function Composer({ onSend }) {
    const [body, setBody] = useState('');
    const [author, setAuthor] = useState(() => typeof localStorage !== 'undefined' ? localStorage.getItem(NICKNAME_KEY) ?? '' : '');
    const [submitting, setSubmitting] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [attachTotalBytes, setAttachTotalBytes] = useState(0);
    const fileInputRef = useRef(null);
    useEffect(() => {
        if (author)
            localStorage.setItem(NICKNAME_KEY, author);
    }, [author]);
    const totalBytesRef = useRef(0);
    totalBytesRef.current = attachTotalBytes;
    const addFiles = useCallback(async (files) => {
        if (!files?.length)
            return;
        let total = totalBytesRef.current;
        const next = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (total + file.size > MAX_TOTAL_ATTACHMENT_BYTES)
                continue;
            const att = await fileToAttachment(file);
            if (att) {
                const decodedLen = Math.floor((att.data_base64.length * 3) / 4);
                total += decodedLen;
                next.push(att);
            }
        }
        if (next.length) {
            const addedBytes = next.reduce((acc, a) => acc + Math.floor((a.data_base64.length * 3) / 4), 0);
            setAttachments((prev) => [...prev, ...next]);
            setAttachTotalBytes((t) => t + addedBytes);
        }
    }, []);
    const removeAttachment = useCallback((index) => {
        setAttachments((prev) => {
            const a = prev[index];
            const bytes = Math.floor((a.data_base64.length * 3) / 4);
            setAttachTotalBytes((t) => Math.max(0, t - bytes));
            return prev.filter((_, i) => i !== index);
        });
    }, []);
    const handleSubmit = async (event) => {
        event?.preventDefault();
        if (!body.trim() && attachments.length === 0)
            return;
        setSubmitting(true);
        try {
            await onSend(body, author || undefined, attachments.length ? attachments : undefined);
            setBody('');
            setAttachments([]);
            setAttachTotalBytes(0);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    const handlePaste = useCallback((e) => {
        const items = e.clipboardData?.files;
        if (items?.length)
            addFiles(items);
    }, [addFiles]);
    const canSend = body.trim().length > 0 || attachments.length > 0;
    return (_jsx("form", { className: "composer", onSubmit: handleSubmit, children: _jsxs("div", { className: "composer-inner", children: [_jsx("input", { type: "text", className: "composer-author", placeholder: "Display name", value: author, onChange: e => setAuthor(e.target.value), maxLength: 32 }), attachments.length > 0 && (_jsx("div", { className: "composer-attachments", children: attachments.map((att, i) => (_jsxs("div", { className: "composer-attach-preview", children: [att.content_type.startsWith('image/') ? (_jsx("img", { src: `data:${att.content_type};base64,${att.data_base64}`, alt: att.filename })) : (_jsx("span", { className: "composer-attach-name", children: att.filename })), _jsx("button", { type: "button", className: "composer-attach-remove", onClick: () => removeAttachment(i), "aria-label": "Remove", children: "\u00D7" })] }, i))) })), _jsxs("div", { className: "composer-input-wrap", children: [_jsx("textarea", { placeholder: "Type a message... Paste or attach images, files, audio, video (Enter to send)", value: body, rows: 1, onChange: e => setBody(e.target.value), onKeyDown: handleKeyDown, onPaste: handlePaste, disabled: submitting }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: "image/*,audio/*,video/*,.pdf,.txt,.json", className: "composer-file-input", onChange: e => {
                                addFiles(e.target.files);
                                e.target.value = '';
                            } }), _jsx("button", { type: "button", className: "composer-attach-btn", onClick: () => fileInputRef.current?.click(), title: "Attach file (images, audio, video, docs)", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "20", height: "20", children: _jsx("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" }) }) }), _jsx("button", { type: "submit", className: "composer-send", disabled: submitting || !canSend, title: "Send (Enter)", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: "20", height: "20", children: _jsx("path", { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }) }) })] }), _jsx("div", { className: "composer-hint", children: "Images, audio, video, files \u2014 max ~400 KB total. Paste image or click \uD83D\uDCCE to attach." })] }) }));
}
