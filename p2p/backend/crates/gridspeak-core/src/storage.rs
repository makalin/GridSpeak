use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::ChatMessage;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
struct ChatSnapshot {
    messages: Vec<ChatMessage>,
}

/// Simple append-only log persisted as JSON on disk.
pub struct ChatStore {
    path: PathBuf,
    data: RwLock<ChatSnapshot>,
}

impl ChatStore {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let data = if path.exists() {
            let raw =
                fs::read_to_string(&path).with_context(|| format!("unable to read {:?}", path))?;
            serde_json::from_str(&raw)
                .with_context(|| format!("invalid store format {:?}", path))?
        } else {
            let snapshot = ChatSnapshot::default();
            let serialized = serde_json::to_string_pretty(&snapshot)?;
            fs::write(&path, serialized)?;
            snapshot
        };

        Ok(Self {
            path,
            data: RwLock::new(data),
        })
    }

    pub fn append(&self, message: ChatMessage) -> Result<()> {
        {
            let mut guard = self.data.write();
            if guard.messages.iter().any(|m| m.id == message.id) {
                return Ok(());
            }
            guard.messages.push(message);
        }
        self.flush()
    }

    fn flush(&self) -> Result<()> {
        let snapshot = self.data.read().clone();
        let contents = serde_json::to_string_pretty(&snapshot)?;
        fs::write(&self.path, contents)?;
        Ok(())
    }

    pub fn messages(&self) -> Vec<ChatMessage> {
        self.data.read().messages.clone()
    }

    pub fn len(&self) -> usize {
        self.data.read().messages.len()
    }
}
