# tchat - Secure Terminal Chat

A cryptographically secure, end-to-end encrypted terminal chat application.

## Features

- **End-to-End Encryption**: All messages are encrypted using Ed25519 signatures and XChaCha20-Poly1305
- **Zero-Knowledge**: Server never sees message content - only encrypted payloads
- **2FA Support**: TOTP-based two-factor authentication
- **Terminal-First**: Built with neo-blessed for a performant CLI experience
- **Real-Time**: Server-Sent Events (SSE) for instant message delivery

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Terminal Client                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   TUI       │  │   State      │  │   Rust     │  │
│  │  (blessed)  │◄─┤   Manager    │◄─┤   Core     │  │
│  └─────────────┘  └──────────────┘  │  (crypto)  │  │
│                                     └────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
                    HTTPS + SSE
                          │
┌─────────────────────────────────────────────────────┐
│                   Relay Server                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   NestJS    │  │   Redis      │  │  Postgres   │  │
│  │   API       │◄─┤   Pub/Sub    │  │   Database  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Rust (for building the crypto core)
- Docker & Docker Compose (for server)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/tchat.git
cd tchat

# Install dependencies
npm install

# Build the Rust crypto core
npm run build:core

# Start the backend (requires Docker)
docker-compose up -d

# Start the server
npm run dev:server

# Start the terminal client
npm run dev:client
```

### Production Deployment

```bash
# Build everything
npm run build

# Deploy with Docker
docker-compose up -d --build
```

## Usage

1. **First Launch**: Enter email and password to create your vault
2. **Subsequent Launches**: Enter password to unlock your private key
3. **Send Messages**: Type in the input bar and press Enter
4. **Navigate**: Use arrow keys to move between channels

## Security

### Cryptography

- **Key Derivation**: Argon2id (memory-hard KDF)
- **Identity**: Ed25519 (Curve25519 elliptic curve)
- **Vault Encryption**: XChaCha20-Poly1305 (AEAD)
- **Message Signing**: Ed25519 signatures

### Trust Model

1. User generates Ed25519 keypair locally
2. Private key encrypted with Argon2id-derived master key
3. Only the public key is ever transmitted to the server
4. Messages are signed before encryption

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/messages` | Send encrypted message |
| GET | `/chat/stream?roomId=X` | SSE message stream |
| GET | `/chat/history/:roomId` | Message history |
| POST | `/users/:pubKey/2fa/setup` | Setup 2FA |
| POST | `/users/:pubKey/2fa/enable` | Enable 2FA |

## Environment Variables

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | - | PostgreSQL connection string |
| REDIS_URL | redis://localhost:6379 | Redis connection string |
| PORT | 3000 | Server port |

### Client

| Variable | Default | Description |
|----------|---------|-------------|
| TCHAT_API_URL | http://localhost:3000 | Server URL |

## License

MIT License - see LICENSE file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request
