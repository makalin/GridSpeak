import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceSignals } from '../hooks/useVoiceSignals';
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
];
export function VoiceVideoPanel({ status }) {
    const myPeerId = status?.peer_id ?? '';
    const peers = status?.peers ?? [];
    const { signals, sendSignal } = useVoiceSignals(1500);
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState(null);
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const pcsRef = useRef(new Map());
    const remoteVideoRefsRef = useRef(new Map());
    const processedSignalsRef = useRef(0);
    const getOrCreatePc = useCallback((remotePeerId) => {
        let pc = pcsRef.current.get(remotePeerId);
        if (!pc) {
            pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            pc.ontrack = (e) => {
                const video = remoteVideoRefsRef.current.get(remotePeerId);
                if (video && e.streams[0]) {
                    video.srcObject = e.streams[0];
                }
            };
            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    sendSignal('ice', JSON.stringify(e.candidate), remotePeerId);
                }
            };
            pcsRef.current.set(remotePeerId, pc);
        }
        return pc;
    }, [sendSignal]);
    const join = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            localStreamRef.current = stream;
            if (localVideoRef.current)
                localVideoRef.current.srcObject = stream;
            for (const peerId of peers) {
                if (peerId === myPeerId)
                    continue;
                const pc = getOrCreatePc(peerId);
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal('offer', pc.localDescription.sdp, peerId);
            }
            setJoined(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not access camera/microphone');
        }
    }, [myPeerId, peers, getOrCreatePc, sendSignal]);
    const leave = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        if (localVideoRef.current)
            localVideoRef.current.srcObject = null;
        pcsRef.current.forEach((pc) => pc.close());
        pcsRef.current.clear();
        remoteVideoRefsRef.current.forEach((el) => {
            el.srcObject = null;
        });
        remoteVideoRefsRef.current.clear();
        setJoined(false);
    }, []);
    useEffect(() => {
        if (!joined || !myPeerId)
            return;
        const list = signals;
        const start = processedSignalsRef.current;
        if (start >= list.length)
            return;
        const process = async () => {
            for (let i = start; i < list.length; i++) {
                const sig = list[i];
                const isForMe = !sig.to || sig.to === myPeerId;
                if (!isForMe || sig.from === myPeerId)
                    continue;
                const pc = getOrCreatePc(sig.from);
                if (sig.type === 'offer') {
                    try {
                        const stream = localStreamRef.current;
                        if (stream && pc.getSenders().length === 0) {
                            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                        }
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sig.data }));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        sendSignal('answer', pc.localDescription.sdp, sig.from);
                    }
                    catch (e) {
                        console.warn('Offer handling failed', e);
                    }
                }
                else if (sig.type === 'answer') {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sig.data }));
                    }
                    catch (e) {
                        console.warn('Answer handling failed', e);
                    }
                }
                else if (sig.type === 'ice') {
                    try {
                        const candidate = JSON.parse(sig.data);
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    catch (e) {
                        console.warn('ICE handling failed', e);
                    }
                }
            }
            processedSignalsRef.current = list.length;
        };
        process();
    }, [signals, joined, myPeerId, getOrCreatePc, sendSignal]);
    useEffect(() => {
        return () => {
            leave();
        };
    }, [leave]);
    const setRemoteVideoRef = useCallback((peerId, el) => {
        if (el)
            remoteVideoRefsRef.current.set(peerId, el);
        else
            remoteVideoRefsRef.current.delete(peerId);
    }, []);
    return (_jsxs("section", { className: "voice-video-panel", children: [_jsxs("div", { className: "voice-video-header", children: [_jsx("span", { className: "label", children: "Voice & Video" }), !joined ? (_jsx("button", { type: "button", className: "voice-video-btn join", onClick: join, disabled: !myPeerId, children: "Join channel" })) : (_jsx("button", { type: "button", className: "voice-video-btn leave", onClick: leave, children: "Leave" }))] }), error && _jsx("div", { className: "banner error compact", children: error }), joined && (_jsxs("div", { className: "voice-video-grid", children: [_jsxs("div", { className: "voice-video-tile local", children: [_jsx("video", { ref: localVideoRef, autoPlay: true, muted: true, playsInline: true }), _jsx("span", { className: "voice-video-label", children: "You" })] }), peers.filter((p) => p !== myPeerId).map((peerId) => (_jsxs("div", { className: "voice-video-tile remote", children: [_jsx("video", { ref: (el) => setRemoteVideoRef(peerId, el), autoPlay: true, playsInline: true }), _jsxs("span", { className: "voice-video-label", children: [peerId.slice(0, 8), "\u2026"] })] }, peerId)))] }))] }));
}
