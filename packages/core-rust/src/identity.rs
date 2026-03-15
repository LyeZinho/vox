use ed25519_dalek::{Signer, SigningKey};
use napi::bindgen_prelude::*;

#[napi(object)]
pub struct IdentityKeys {
    pub public_key: Buffer,
    pub private_key: Buffer,
}

#[napi]
pub fn generate_keypair() -> Result<IdentityKeys> {
    use rand::rngs::OsRng;
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();
    
    Ok(IdentityKeys {
        public_key: verifying_key.to_bytes().to_vec().into(),
        private_key: signing_key.to_bytes().to_vec().into(),
    })
}

#[napi]
pub fn sign_payload(payload: Buffer, private_key_bytes: Buffer) -> Result<Buffer> {
    let key_bytes: [u8; 32] = private_key_bytes.as_ref()
        .try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Private key must be exactly 32 bytes".to_string()))?;
        
    let signing_key = SigningKey::from_bytes(&key_bytes);
    let signature = signing_key.sign(payload.as_ref());
    
    Ok(signature.to_bytes().to_vec().into())
}
