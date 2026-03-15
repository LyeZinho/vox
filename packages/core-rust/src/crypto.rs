use argon2::{Algorithm, Argon2, Params, Version};
use napi::bindgen_prelude::*;

#[napi]
pub fn derive_master_key(password: String, salt: String) -> Result<Buffer> {
    let params = Params::new(
        Params::DEFAULT_M_COST,
        Params::DEFAULT_T_COST,
        Params::DEFAULT_P_COST,
        Some(32), // 32 bytes required for XChaCha20
    ).map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
    
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    
    let mut key = vec![0u8; 32];
    argon2.hash_password_into(password.as_bytes(), salt.as_bytes(), &mut key)
        .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
        
    Ok(key.into())
}
