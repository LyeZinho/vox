# tchat Protocol Specification

This document describes the cryptographic protocols and message formats used by tchat.

## Overview

tchat is a zero-knowledge chat application where:
- The server never sees plaintext message content
- All messages are signed by the sender's Ed25519 key
- The server acts only as a relay for encrypted payloads

## Cryptographic Primitives

| Primitive | Algorithm | Purpose |
|-----------|-----------|---------|
| Key Derivation | Argon2id | Derive master key from password |
| Identity | Ed25519 | User identity and signing |
| Vault Encryption | XChaCha20-Poly1305 | Encrypt private key at rest |
| 2FA | TOTP (RFC 6238) | Two-factor authentication |

## Key Derivation (Argon2id)

When creating a vault:
1. Generate random 16-byte salt
2. Derive master key: `Argon2id(password, salt, m=65536, t=3, p=4)`
3. Store: `{ salt, encryptedPrivateKey, publicKey }`

Parameters:
- Memory: 64 MB
- Iterations: 3
- Parallelism: 4
- Salt: 16 bytes random

## Vault Format

Location: `~/.tkeys/vault.json`

```json
{
  "version": 1,
  "salt": "base64-encoded-salt",
  "encryptedPrivateKey": "base64-encoded-encrypted-key",
  "publicKey": "base64-encoded-public-key",
  "email": "hashed-email",
  "createdAt": "ISO-timestamp"
}
```

## Message Format

### Sending a Message

1. Create JSON payload:
```json
{
  "content": "Hello, world!",
  "timestamp": 1699999999999
}
```

2. Sign with Ed25519 private key:
```
signature = Ed25519Sign(payload, privateKey)
```

3. Send to server:
```json
{
  "channelId": "general",
  "payload": "base64(json)",
  "signature": "base64(signature)",
  "nonce": "random-uuid",
  "timestamp": 1699999999999,
  "senderPubKey": "base64(publicKey)"
}
```

### Server Storage

The server stores:
- `content`: Base64-encoded encrypted payload
- `signature`: Ed25519 signature
- `nonce`: Message nonce
- `timestamp`: Unix timestamp (BigInt)
- `senderPubKey`: Sender's public key
- `roomId`: Target room ID

The server **never** decrypts or validates the content - it only verifies the signature format.

### Signature Verification

Clients verify incoming messages:
1. Decode `payload` from base64
2. Verify `Ed25519Verify(payload, signature, senderPubKey)`
3. If valid, decrypt and display

## API Endpoints

### POST /chat/messages

Send an encrypted message.

Request:
```json
{
  "channelId": "general",
  "payload": "base64-encoded-json",
  "signature": "base64-ed25519-signature",
  "nonce": "uuid",
  "timestamp": 1699999999999,
  "senderPubKey": "base64-public-key"
}
```

Response: Created message object

### GET /chat/stream?roomId={room}

Server-Sent Events stream for real-time messages.

### GET /chat/history/{roomId}

Get last 50 messages for a room.

### GET /chat/rooms

List available rooms.

### POST /chat/rooms

Create a new room.

Request:
```json
{
  "name": "room-name",
  "isModerated": false
}
```

## Security Considerations

### Threat Model

- **Server compromise**: Attacker cannot read messages (only encrypted payloads)
- **Man-in-the-middle**: All messages signed, tampering detectable
- **Password compromise**: Attacker needs password + vault file to derive key
- **2FA**: Additional layer for account recovery

### Known Limitations

1. **No forward secrecy**: If private key is compromised, old messages can be decrypted
2. **Room encryption**: Currently room keys are not implemented - anyone with room access can read
3. **No deniability**: Signatures provide non-repudiation

## Future Enhancements

1. **Double Ratchet**: Forward secrecy for messages
2. **Room keys**: Symmetric encryption per room
3. **Sealed sender**: Hide sender identity from server
