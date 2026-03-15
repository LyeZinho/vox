use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use napi::bindgen_prelude::*;

#[napi]
pub fn encrypt_identity(private_key: Buffer, master_key: Buffer) -> Result<Buffer> {
    let key_bytes: [u8; 32] = master_key.as_ref().try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Master key must be exactly 32 bytes".to_string()))?;
        
    let cipher = XChaCha20Poly1305::new(&key_bytes.into());
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng); // 24 bytes
    
    let ciphertext = cipher.encrypt(&nonce, private_key.as_ref())
        .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
        
    // Format: [24 bytes nonce][ciphertext]
    let mut result = nonce.to_vec();
    result.extend_from_slice(&ciphertext);
    Ok(result.into())
}

#[napi]
pub fn decrypt_identity(encrypted_data: Buffer, master_key: Buffer) -> Result<Buffer> {
    if encrypted_data.len() < 24 {
        return Err(Error::new(Status::InvalidArg, "Encrypted data is too short".to_string()));
    }
    
    let key_bytes: [u8; 32] = master_key.as_ref().try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Master key must be exactly 32 bytes".to_string()))?;
        
    let cipher = XChaCha20Poly1305::new(&key_bytes.into());
    
    let (nonce_bytes, ciphertext) = encrypted_data.as_ref().split_at(24);
    let nonce = XNonce::from_slice(nonce_bytes);
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|_e| Error::new(Status::GenericFailure, "Failed to decrypt. Wrong password or corrupted file".to_string()))?;
        
    Ok(plaintext.into())
}
