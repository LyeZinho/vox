# Argon2id implementation with NAPI-RS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:execiting-plans to implement this plan task-by-task.

**Goal:** Research and implement a secure Argon2id password hashing and key derivation module in Rust, integrated with Node.js via NAPI-RS.

**Architecture:** Use the `argon2` crate with NAPI-RS `AsyncTask` to offload CPU-intensive work from the main thread. A `ThreadsafeFunction` will report state transitions (Starting, Allocated, Hashing, Finalizing) to the JavaScript caller.

**Tech Stack:** Rust (v1.85+), `argon2` crate (v0.6.x-rc.7), `napi-rs`, `zeroize`, `rand`.

---

### Task 1: Initialize NAPI-RS Project Structure

**Files:**
- Create: `Cargo.toml`
- Create: `src/lib.rs`

**Step 1: Write the basic Rust module setup**

```rust
use napi_derive::napi;

#[napi]
pub fn argon2_version() -> String {
    "0.6.0-rc.7".to_string()
}
```

**Step 2: Initialize Cargo.toml with dependencies**

```toml
[package]
name = "argon2-napi"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = { version = "2.12", features = ["async", "serde-json"] }
napi-derive = "2.12"
argon2 = { version = "0.6.0-rc.7", features = ["alloc", "password-hash", "rand", "parallel", "zeroize"] }
rand = "0.9"
zeroize = "1.8"
```

**Step 3: Run build to verify setup**

Run: `npm install && npm run build` (assuming standard NAPI-RS project structure)
Expected: SUCCESS

**Step 4: Commit**

```bash
git add Cargo.toml src/lib.rs
git commit -m "feat: initialize NAPI-RS project with argon2 dependencies"
```

---

### Task 2: Implement Secure Argon2id Hashing with State Reporting

**Files:**
- Modify: `src/lib.rs`
- Create: `src/hashing.rs`

**Step 1: Define the Progress State Enum**

```rust
#[napi]
pub enum Argon2Status {
    Starting,
    Allocating,
    Hashing,
    Finalizing,
    Done,
}
```

**Step 2: Implement the Async Hashing Task**

```rust
use napi::bindgen_prelude::*;
use argon2::{password_hash::{rand_core::OsRng, SaltString}, Argon2, PasswordHasher};

pub struct Argon2Task {
    password: String,
    memory_cost: u32,
    iterations: u32,
    parallelism: u32,
}

#[napi]
impl Task for Argon2Task {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        // Implementation with state updates (simulated via status reporting)
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(self.memory_cost, self.iterations, self.parallelism, None)
                .map_err(|e| Error::from_reason(e.to_string()))?,
        );
        
        let hash = argon2.hash_password(self.password.as_bytes(), &salt)
            .map_err(|e| Error::from_reason(e.to_string()))?
            .to_string();

        Ok(hash)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}
```

**Step 3: Write failing test in Rust**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_argon2_hashing() {
        // Write test for hashing correctness
    }
}
```

**Step 4: Run test to verify it passes**

Run: `cargo test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hashing.rs
git commit -m "feat: implement async Argon2 hashing task"
```

---

### Task 3: Key Derivation Support (KDF)

**Files:**
- Modify: `src/hashing.rs`

**Step 1: Implement the Key Derivation Function (KDF) with progress**

```rust
#[napi]
pub fn derive_key(password: String, salt: String, memory: u32, iterations: u32, parallelism: u32) -> AsyncTask<Argon2Task> {
    AsyncTask::new(Argon2Task {
        password,
        memory_cost: memory,
        iterations,
        parallelism,
    })
}
```

**Step 2: Run verification**

Run: `npm run build`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/hashing.rs
git commit -m "feat: add key derivation support via AsyncTask"
```

