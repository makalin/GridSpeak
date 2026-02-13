use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A single file/image/audio/video attachment (inline base64 for small files).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    /// MIME type, e.g. image/png, application/octet-stream
    pub content_type: String,
    /// Original filename for download
    pub filename: String,
    /// Inline data (base64). Keep small to avoid huge gossip payloads (e.g. < 500 KB total per message).
    pub data_base64: String,
}

/// A replicated chat message shared over the mesh.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub author: String,
    pub body: String,
    pub timestamp: DateTime<Utc>,
    #[serde(default)]
    pub attachments: Vec<Attachment>,
}

impl ChatMessage {
    pub fn new(author: impl Into<String>, body: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            author: author.into(),
            body: body.into(),
            timestamp: Utc::now(),
            attachments: Vec::new(),
        }
    }

    pub fn with_attachments(
        author: impl Into<String>,
        body: impl Into<String>,
        attachments: Vec<Attachment>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            author: author.into(),
            body: body.into(),
            timestamp: Utc::now(),
            attachments,
        }
    }
}
