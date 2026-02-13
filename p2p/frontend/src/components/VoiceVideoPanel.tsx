import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeStatus } from '../types';
import { useVoiceSignals } from '../hooks/useVoiceSignals';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];

interface Props {
  status: NodeStatus | null;
}

export function VoiceVideoPanel({ status }: Props) {
  const myPeerId = status?.peer_id ?? '';
  const peers = status?.peers ?? [];
  const { signals, sendSignal } = useVoiceSignals(1500);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideoRefsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const processedSignalsRef = useRef<number>(0);

  const getOrCreatePc = useCallback((remotePeerId: string) => {
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
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      for (const peerId of peers) {
        if (peerId === myPeerId) continue;
        const pc = getOrCreatePc(peerId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('offer', pc.localDescription!.sdp!, peerId);
      }
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access camera/microphone');
    }
  }, [myPeerId, peers, getOrCreatePc, sendSignal]);

  const leave = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    remoteVideoRefsRef.current.forEach((el) => {
      el.srcObject = null;
    });
    remoteVideoRefsRef.current.clear();
    setJoined(false);
  }, []);

  useEffect(() => {
    if (!joined || !myPeerId) return;
    const list = signals;
    const start = processedSignalsRef.current;
    if (start >= list.length) return;
    const process = async () => {
      for (let i = start; i < list.length; i++) {
        const sig = list[i];
        const isForMe = !sig.to || sig.to === myPeerId;
        if (!isForMe || sig.from === myPeerId) continue;
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
            sendSignal('answer', pc.localDescription!.sdp!, sig.from);
          } catch (e) {
            console.warn('Offer handling failed', e);
          }
        } else if (sig.type === 'answer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sig.data }));
          } catch (e) {
            console.warn('Answer handling failed', e);
          }
        } else if (sig.type === 'ice') {
          try {
            const candidate = JSON.parse(sig.data);
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
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

  const setRemoteVideoRef = useCallback((peerId: string, el: HTMLVideoElement | null) => {
    if (el) remoteVideoRefsRef.current.set(peerId, el);
    else remoteVideoRefsRef.current.delete(peerId);
  }, []);

  return (
    <section className="voice-video-panel">
      <div className="voice-video-header">
        <span className="label">Voice & Video</span>
        {!joined ? (
          <button type="button" className="voice-video-btn join" onClick={join} disabled={!myPeerId}>
            Join channel
          </button>
        ) : (
          <button type="button" className="voice-video-btn leave" onClick={leave}>
            Leave
          </button>
        )}
      </div>
      {error && <div className="banner error compact">{error}</div>}
      {joined && (
        <div className="voice-video-grid">
          <div className="voice-video-tile local">
            <video ref={localVideoRef} autoPlay muted playsInline />
            <span className="voice-video-label">You</span>
          </div>
          {peers.filter((p) => p !== myPeerId).map((peerId) => (
            <div key={peerId} className="voice-video-tile remote">
              <video
                ref={(el) => setRemoteVideoRef(peerId, el)}
                autoPlay
                playsInline
              />
              <span className="voice-video-label">{peerId.slice(0, 8)}…</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
