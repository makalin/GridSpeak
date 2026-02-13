//! Core utilities shared across GridSpeak nodes.
//!
//! The crate intentionally stays lightweight and runtime agnostic so both
//! command-line and GUI front-ends can re-use the same configuration and
//! storage primitives.

pub mod config;
pub mod message;
pub mod storage;

pub use config::{NodeConfig, load_or_create_config};
pub use message::{Attachment, ChatMessage};
pub use storage::ChatStore;
