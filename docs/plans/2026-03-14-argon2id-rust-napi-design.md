# Argon2id Password Hashing & Key Derivation in Rust (2026)

## Overview
A high-performance, secure password hashing and key derivation module using Argon2id in Rust, integrated with Node.js via NAPI-RS. This design prioritizes OWASP 2026 / RFC 9106 security standards and provides user feedback during resource-intensive hashing.

## Goals
1. **Security**: Implement Argon2id (v1.3) to resist GPU brute-force and side-channel attacks.
2. **Responsiveness**: Offload CPU-heavy hashing to a background thread to keep the Node.js event loop free.
3. **UX Feedback**: Provide coarse-grained progress updates (State Changes) for long-running KDF tasks.
4. **Safety**: Use zeroization for sensitive memory and ensure constant-time verification.

## Architecture

### Components
- **Rust Addon (`argon2-napi`)**: Native module exposing async functions to Node.js.
- **Argon2 Crate**: Pure Rust implementation (v0.6.x-rc.7) for memory-hard hashing.
- **NAPI-RS `AsyncTask`**: Manages the lifecycle of the asynchronous operation on the `libuv` thread pool.
- **`ThreadsafeFunction`**: Communicates status updates from the Rust worker thread back to the JavaScript main thread.

### Parameters (RFC 9106)
- **Interactive Login**:
  - Memory: 64 MiB
  - Iterations (t): 3
  - Parallelism (p): 1
- **High-Security / Key Derivation**:
  - Memory: 256 MiB+
  - Iterations (t): 1+
  - Parallelism (p): Tuned to available CPU cores (typically 4-8).

## Data Flow & Progress Reporting
Argon2 does not natively expose progress callbacks for its memory-filling passes. To maintain security, we will report **State Changes**:

1. **`STARTING`**: Task initiated.
2. **`ALLOCATING`**: Memory for hashing is being reserved.
3. **`HASHING`**: The Argon2id algorithm is running (most time-intensive phase).
4. **`FINALIZING`**: Hash computation complete, formatting output.
5. **`DONE`**: Result returned to JS.

## Security Considerations
- **Memory Hardness**: Ensure memory allocation succeeds before hashing.
- **Zeroization**: All sensitive input (plaintext passwords, salts) must be zeroed after the hash is computed.
- **Constant Time**: Use `argon2::verify` to ensure comparison is timing-attack resistant.
- **Salt Generation**: Always use a 16-byte cryptographically secure random salt (e.g., `rand::rngs::OsRng`).

## Integration (NAPI-RS)
- **`compute`**: Runs the Argon2 algorithm in a background thread.
- **`on_progress`**: Triggered via `ThreadsafeFunction` to notify JS of state transitions.
- **`resolve`**: Returns the PHC-formatted hash string or raw derived key.

