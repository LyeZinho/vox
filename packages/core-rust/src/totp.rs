use napi::bindgen_prelude::*;
use totp_rs::{Algorithm, TOTP};

#[napi]
pub fn generate_totp_uri(issuer: String, account_name: String) -> Result<String> {
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        vec![0u8; 20],
        Some(issuer),
        account_name,
    )
    .map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to create TOTP: {}", e),
        )
    })?;

    Ok(totp.get_url())
}

#[napi]
pub fn verify_totp(secret: String, code: String) -> Result<bool> {
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret.as_bytes().to_vec(),
        None,
        "VAX".to_string(), // Updated for rebranding
    )
    .map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to create TOTP: {}", e),
        )
    })?;

    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Time error: {}", e)))?
        .as_secs();

    let is_valid = totp.check(&code, time);
    Ok(is_valid)
}

#[napi]
pub fn generate_totp_secret() -> Result<String> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let secret: Vec<u8> = (0..20).map(|_| rng.gen()).collect();
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &secret,
    ))
}
