//! 234 suite AI backend (root CLAUDE.md §6).
//!
//! Stores user-supplied Claude/OpenAI API keys in the **OS keychain** (Windows
//! Credential Manager / macOS Keychain / Linux Secret Service via `keyring`) and
//! performs the cloud completion **here in Rust**, reading the key from the
//! keychain at call time. The key is therefore never returned to the frontend
//! (JS can only set / clear / check-presence), never persisted in plaintext, and
//! transmitted only to the provider's own API endpoint. 234 never ships a key.
//!
//! Exposed as **plain functions** (no `tauri` dependency); each app's `src-tauri`
//! wraps them in thin `#[tauri::command]`s and registers those via
//! `generate_handler!`. (Defining the commands here, in a dependency crate, would
//! trip Tauri's generated-macro name collision — hence the plain-function split.)
//!
//! Storage is keychain-first with an **AES-256-GCM encrypted-file fallback** (§6)
//! for systems without an OS keychain (e.g. headless Linux without Secret
//! Service): the file lives in the app data dir, encrypted under a key derived
//! from a machine-specific id. A key is therefore never written in plaintext.

use keyring::Entry;

const SERVICE: &str = "234-suite";

fn account(provider: &str) -> String {
    format!("ai:{provider}")
}

/// True when the keychain backend itself is unavailable (vs. a missing entry) —
/// the signal to use the encrypted-file fallback.
fn keyring_unavailable(err: &keyring::Error) -> bool {
    matches!(
        err,
        keyring::Error::NoStorageAccess(_) | keyring::Error::PlatformFailure(_)
    )
}

/// Store a secret: OS keychain when available, else the encrypted file.
fn store_set(provider: &str, key: &str) -> Result<(), String> {
    match Entry::new(SERVICE, &account(provider)) {
        Ok(entry) => match entry.set_password(key) {
            Ok(()) => Ok(()),
            Err(e) if keyring_unavailable(&e) => secretfile::set(provider, key),
            Err(e) => Err(format!("Could not store the key: {e}")),
        },
        Err(e) if keyring_unavailable(&e) => secretfile::set(provider, key),
        Err(e) => Err(format!("Secure storage unavailable: {e}")),
    }
}

/// Read a secret: keychain first, then the encrypted file (so a key stored by
/// either path is found). `None` when absent.
fn store_get(provider: &str) -> Result<Option<String>, String> {
    match Entry::new(SERVICE, &account(provider)) {
        Ok(entry) => match entry.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => secretfile::get(provider),
            Err(e) if keyring_unavailable(&e) => secretfile::get(provider),
            Err(e) => Err(format!("Could not read the keychain: {e}")),
        },
        Err(e) if keyring_unavailable(&e) => secretfile::get(provider),
        Err(e) => Err(format!("Secure storage unavailable: {e}")),
    }
}

/// Remove a secret from both stores (best-effort on the keychain).
fn store_delete(provider: &str) -> Result<(), String> {
    if let Ok(entry) = Entry::new(SERVICE, &account(provider)) {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(e) if keyring_unavailable(&e) => {}
            Err(e) => return Err(format!("Could not remove the key: {e}")),
        }
    }
    secretfile::delete(provider)
}

/// Store an API key for a provider (OS keychain, or the encrypted-file fallback).
pub fn set_key(provider: &str, key: &str) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err("The API key is empty.".into());
    }
    store_set(provider, key)
}

/// Remove a stored API key (no error if there was none).
pub fn delete_key(provider: &str) -> Result<(), String> {
    store_delete(provider)
}

/// Whether a key is stored for the provider. Never returns the key itself.
pub fn has_key(provider: &str) -> Result<bool, String> {
    Ok(store_get(provider)?.is_some())
}

/// Run a cloud completion. Reads the key from secure storage (never from JS),
/// calls the provider, and returns the generated text.
pub fn cloud_complete(
    provider: &str,
    model: &str,
    system: Option<&str>,
    prompt: &str,
) -> Result<String, String> {
    let key = match store_get(provider)? {
        Some(k) => k,
        None => return Err(format!("No API key for {provider}. Add one in AI settings.")),
    };

    match provider {
        "claude" => claude_complete(&key, model, system, prompt),
        "openai" => openai_complete(&key, model, system, prompt),
        other => Err(format!("Unknown provider: {other}")),
    }
}

/// AES-256-GCM encrypted-file fallback (§6) — used only when no OS keychain is
/// available. Each key is encrypted under a machine-derived key and stored
/// (nonce ++ ciphertext) in a JSON map in the app data dir. Never plaintext.
mod secretfile {
    use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};
    use aes_gcm::{Aes256Gcm, Key, Nonce};
    use sha2::{Digest, Sha256};
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    const SALT: &str = "234-suite-ai-keys-v1";
    // Test-only override so unit tests don't touch the real app data dir.
    const DIR_OVERRIDE_ENV: &str = "APP234_AI_DIR";
    const NONCE_LEN: usize = 12;

    fn data_dir() -> Result<PathBuf, String> {
        if let Ok(dir) = std::env::var(DIR_OVERRIDE_ENV) {
            return Ok(PathBuf::from(dir));
        }
        let base = dirs::data_local_dir().ok_or("No app data directory available")?;
        Ok(base.join("234-suite"))
    }

    fn keys_path() -> Result<PathBuf, String> {
        Ok(data_dir()?.join("ai-keys.json"))
    }

    /// 32-byte key = SHA-256(salt | machine id). Stable per machine, not portable.
    fn machine_key() -> [u8; 32] {
        let id = machine_uid::get().unwrap_or_else(|_| "234-suite-unknown-machine".to_string());
        let mut hasher = Sha256::new();
        hasher.update(SALT.as_bytes());
        hasher.update(b"|");
        hasher.update(id.as_bytes());
        hasher.finalize().into()
    }

    pub fn encrypt(machine_key: &[u8; 32], plaintext: &str) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(machine_key));
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher
            .encrypt(&nonce, plaintext.as_bytes())
            .map_err(|_| "Encryption failed".to_string())?;
        let mut blob = nonce.to_vec();
        blob.extend_from_slice(&ciphertext);
        Ok(blob)
    }

    pub fn decrypt(machine_key: &[u8; 32], blob: &[u8]) -> Result<String, String> {
        if blob.len() < NONCE_LEN {
            return Err("Corrupt secret".into());
        }
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(machine_key));
        let (nonce_bytes, ciphertext) = blob.split_at(NONCE_LEN);
        let plaintext = cipher
            .decrypt(Nonce::from_slice(nonce_bytes), ciphertext)
            .map_err(|_| "Decryption failed".to_string())?;
        String::from_utf8(plaintext).map_err(|_| "Corrupt secret".to_string())
    }

    fn read_map() -> Result<BTreeMap<String, Vec<u8>>, String> {
        match std::fs::read(keys_path()?) {
            Ok(bytes) => {
                serde_json::from_slice(&bytes).map_err(|e| format!("Corrupt secrets file: {e}"))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(BTreeMap::new()),
            Err(e) => Err(format!("Could not read the secrets file: {e}")),
        }
    }

    fn write_map(map: &BTreeMap<String, Vec<u8>>) -> Result<(), String> {
        std::fs::create_dir_all(data_dir()?)
            .map_err(|e| format!("Could not create the app data dir: {e}"))?;
        let bytes = serde_json::to_vec(map).map_err(|e| format!("Could not serialise secrets: {e}"))?;
        std::fs::write(keys_path()?, bytes).map_err(|e| format!("Could not write secrets: {e}"))
    }

    pub fn set(provider: &str, key: &str) -> Result<(), String> {
        let mut map = read_map()?;
        map.insert(provider.to_string(), encrypt(&machine_key(), key)?);
        write_map(&map)
    }

    pub fn get(provider: &str) -> Result<Option<String>, String> {
        match read_map()?.get(provider) {
            Some(blob) => Ok(Some(decrypt(&machine_key(), blob)?)),
            None => Ok(None),
        }
    }

    pub fn delete(provider: &str) -> Result<(), String> {
        let mut map = read_map()?;
        if map.remove(provider).is_some() {
            write_map(&map)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::secretfile;

    #[test]
    fn encrypt_round_trips_and_is_not_plaintext() {
        let machine_key = [7u8; 32];
        let blob = secretfile::encrypt(&machine_key, "sk-secret-123").unwrap();
        assert_ne!(blob.as_slice(), b"sk-secret-123".as_slice());
        assert_eq!(secretfile::decrypt(&machine_key, &blob).unwrap(), "sk-secret-123");
    }

    #[test]
    fn decrypt_fails_with_a_different_machine_key() {
        let blob = secretfile::encrypt(&[1u8; 32], "secret").unwrap();
        assert!(secretfile::decrypt(&[2u8; 32], &blob).is_err());
    }

    #[test]
    fn file_set_get_delete_round_trip() {
        let dir = std::env::temp_dir().join(format!("app234-ai-test-{}", std::process::id()));
        std::env::set_var("APP234_AI_DIR", &dir);
        secretfile::set("claude", "sk-abc").unwrap();
        assert_eq!(secretfile::get("claude").unwrap().as_deref(), Some("sk-abc"));
        assert_eq!(secretfile::get("openai").unwrap(), None);
        secretfile::delete("claude").unwrap();
        assert_eq!(secretfile::get("claude").unwrap(), None);
        std::env::remove_var("APP234_AI_DIR");
        let _ = std::fs::remove_dir_all(&dir);
    }
}

/// Send a request body and read the response text, surfacing HTTP error bodies.
fn send(req: ureq::Request, body: &serde_json::Value) -> Result<String, String> {
    let payload = serde_json::to_string(body).map_err(|e| format!("Bad request body: {e}"))?;
    match req.send_string(&payload) {
        Ok(resp) => resp
            .into_string()
            .map_err(|e| format!("Could not read the response: {e}")),
        Err(ureq::Error::Status(code, resp)) => {
            let detail = resp.into_string().unwrap_or_default();
            Err(format!("Provider returned {code}: {detail}"))
        }
        Err(e) => Err(format!("Request failed: {e}")),
    }
}

fn claude_complete(
    key: &str,
    model: &str,
    system: Option<&str>,
    prompt: &str,
) -> Result<String, String> {
    let mut body = serde_json::json!({
        "model": model,
        "max_tokens": 1024,
        "messages": [ { "role": "user", "content": prompt } ],
    });
    if let Some(sys) = system {
        body["system"] = serde_json::Value::String(sys.to_string());
    }

    let req = ureq::post("https://api.anthropic.com/v1/messages")
        .set("x-api-key", key)
        .set("anthropic-version", "2023-06-01")
        .set("content-type", "application/json");
    let text = send(req, &body)?;

    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Unexpected response: {e}"))?;
    value["content"][0]["text"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| format!("Unexpected Claude response: {text}"))
}

fn openai_complete(
    key: &str,
    model: &str,
    system: Option<&str>,
    prompt: &str,
) -> Result<String, String> {
    let mut messages: Vec<serde_json::Value> = Vec::new();
    if let Some(sys) = system {
        messages.push(serde_json::json!({ "role": "system", "content": sys }));
    }
    messages.push(serde_json::json!({ "role": "user", "content": prompt }));
    let body = serde_json::json!({ "model": model, "messages": messages });

    let req = ureq::post("https://api.openai.com/v1/chat/completions")
        .set("authorization", &format!("Bearer {key}"))
        .set("content-type", "application/json");
    let text = send(req, &body)?;

    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Unexpected response: {e}"))?;
    value["choices"][0]["message"]["content"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| format!("Unexpected OpenAI response: {text}"))
}
