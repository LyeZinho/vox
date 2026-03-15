#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use napi::Result; // Added for Result type in copy_to_clipboard
use arboard; // Added for clipboard functionality

pub mod crypto;
pub mod identity;
pub mod storage;

#[napi]
pub fn get_audit_info() -> String {
    format!(
        "VAX Chat Core\nVersion: 1.0.0\nCrypto: Argon2id, XChaCha20-Poly1305, Ed25519\nBuild: {}",
        env!("CARGO_PKG_VERSION")
    )
}

#[napi]
pub fn copy_to_clipboard(text: String) -> Result<()> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| napi::Error::from_reason(e.to_string()))?;
    clipboard.set_text(text).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(())
}

pub mod vault;
pub mod totp;
pub mod images;

#[napi]
pub fn ping() -> String {
    "pong".to_string()
}
