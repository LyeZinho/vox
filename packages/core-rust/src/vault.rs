use crate::crypto::derive_master_key;
use crate::identity::{generate_keypair, IdentityKeys};
use crate::storage::{decrypt_identity, encrypt_identity};
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Vault file format stored in ~/.tkeys/vault.json
#[derive(Serialize, Deserialize)]
struct VaultMetadata {
    version: u32,
    pub_key: String,               // Base64 encoded public key
    encrypted_private_key: String, // Base64 encoded encrypted private key
    salt: String,                  // Base64 encoded salt used for KDF
    created_at: String,
}

/// Creates the .tkeys directory if it doesn't exist
fn get_tkeys_dir() -> Result<PathBuf> {
    let home = dirs::home_dir()
        .ok_or_else(|| Error::new(Status::GenericFailure, "Could not find home directory"))?;
    let tkeys_dir = home.join(".tkeys");

    if !tkeys_dir.exists() {
        fs::create_dir_all(&tkeys_dir).map_err(|e| {
            Error::new(
                Status::GenericFailure,
                format!("Failed to create .tkeys directory: {}", e),
            )
        })?;
    }

    Ok(tkeys_dir)
}

/// Checks if a vault already exists
#[napi]
pub fn is_vault_initialized() -> Result<bool> {
    let vault_path = get_tkeys_dir()?.join("vault.json");
    Ok(vault_path.exists())
}

/// Creates a new vault with the given password and email
#[napi]
pub fn create_vault(password: String, email: String) -> Result<String> {
    let tkeys_dir = get_tkeys_dir()?;
    let vault_path = tkeys_dir.join("vault.json");

    if vault_path.exists() {
        return Err(Error::new(
            Status::GenericFailure,
            "Vault already exists. Use unlock_vault instead.",
        ));
    }

    // Generate identity keypair
    let identity: IdentityKeys = generate_keypair()?;

    // Derive master key from password
    let salt = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, email.as_bytes());
    let master_key = derive_master_key(password.clone(), salt.clone())?;

    // Encrypt the private key with the master key
    let encrypted_private_key = encrypt_identity(identity.private_key.clone(), master_key.clone())?;

    // Create vault metadata
    let metadata = VaultMetadata {
        version: 1,
        pub_key: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            identity.public_key.as_ref(),
        ),
        encrypted_private_key: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            encrypted_private_key.as_ref(),
        ),
        salt,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    // Write vault to file
    let json = serde_json::to_string_pretty(&metadata).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to serialize vault: {}", e),
        )
    })?;

    fs::write(&vault_path, json).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to write vault file: {}", e),
        )
    })?;

    // Return the public key
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        identity.public_key.as_ref(),
    ))
}

/// Unlocks the vault with the given password and returns the identity keys
#[napi]
pub fn unlock_vault(password: String) -> Result<IdentityKeys> {
    let tkeys_dir = get_tkeys_dir()?;
    let vault_path = tkeys_dir.join("vault.json");

    if !vault_path.exists() {
        return Err(Error::new(
            Status::GenericFailure,
            "Vault does not exist. Use create_vault first.",
        ));
    }

    // Read vault file
    let json = fs::read_to_string(&vault_path).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to read vault file: {}", e),
        )
    })?;

    let metadata: VaultMetadata = serde_json::from_str(&json).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to parse vault file: {}", e),
        )
    })?;

    // Derive master key from password
    let master_key = derive_master_key(password, metadata.salt.clone())?;

    // Decode encrypted private key
    let encrypted_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &metadata.encrypted_private_key,
    )
    .map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to decode encrypted key: {}", e),
        )
    })?;

    // Decrypt private key
    let private_key = decrypt_identity(Buffer::from(encrypted_bytes), master_key)?;

    // Decode public key
    let public_key_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &metadata.pub_key,
    )
    .map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to decode public key: {}", e),
        )
    })?;

    Ok(IdentityKeys {
        public_key: Buffer::from(public_key_bytes),
        private_key,
    })
}

/// Gets the public key from the vault without unlocking
#[napi]
pub fn get_vault_pub_key() -> Result<String> {
    let tkeys_dir = get_tkeys_dir()?;
    let vault_path = tkeys_dir.join("vault.json");

    if !vault_path.exists() {
        return Err(Error::new(Status::GenericFailure, "Vault does not exist."));
    }

    let json = fs::read_to_string(&vault_path).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to read vault file: {}", e),
        )
    })?;

    let metadata: VaultMetadata = serde_json::from_str(&json).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to parse vault file: {}", e),
        )
    })?;

    Ok(metadata.pub_key)
}

/// Deletes the vault (dangerous!)
#[napi]
pub fn delete_vault() -> Result<()> {
    let tkeys_dir = get_tkeys_dir()?;
    let vault_path = tkeys_dir.join("vault.json");

    if vault_path.exists() {
        fs::remove_file(&vault_path).map_err(|e| {
            Error::new(
                Status::GenericFailure,
                format!("Failed to delete vault: {}", e),
            )
        })?;
    }

    Ok(())
}
