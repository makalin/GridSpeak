export type Attachment = {
  content_type: string;
  filename: string;
  data_base64: string;
};

export type ChatMessage = {
  id: string;
  author: string;
  body: string;
  timestamp: string;
  attachments?: Attachment[];
};

export type MessageComposerPayload = {
  author?: string;
  body: string;
  attachments?: Attachment[];
};

export type NodeStatus = {
  peer_id: string;
  peers: string[];
  messageCount: number;
  lastMessage: string | null;
};

export type VoiceSignal = {
  from: string;
  to?: string | null;
  type: string; // "offer" | "answer" | "ice"
  data: string;
};
