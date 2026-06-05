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

use keyring::Entry;

const SERVICE: &str = "234-suite";

fn account(provider: &str) -> String {
    format!("ai:{provider}")
}

fn entry(provider: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, &account(provider)).map_err(|e| format!("Secure storage unavailable: {e}"))
}

/// Store an API key for a provider in the OS keychain.
pub fn set_key(provider: &str, key: &str) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err("The API key is empty.".into());
    }
    entry(provider)?
        .set_password(key)
        .map_err(|e| format!("Could not store the key: {e}"))
}

/// Remove a stored API key (no error if there was none).
pub fn delete_key(provider: &str) -> Result<(), String> {
    match entry(provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Could not remove the key: {e}")),
    }
}

/// Whether a key is stored for the provider. Never returns the key itself.
pub fn has_key(provider: &str) -> Result<bool, String> {
    match entry(provider)?.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("Could not read the keychain: {e}")),
    }
}

/// Run a cloud completion. Reads the key from the keychain (never from JS),
/// calls the provider, and returns the generated text.
pub fn cloud_complete(
    provider: &str,
    model: &str,
    system: Option<&str>,
    prompt: &str,
) -> Result<String, String> {
    let key = match entry(provider)?.get_password() {
        Ok(k) => k,
        Err(keyring::Error::NoEntry) => {
            return Err(format!("No API key for {provider}. Add one in AI settings."))
        }
        Err(e) => return Err(format!("Could not read the keychain: {e}")),
    };

    match provider {
        "claude" => claude_complete(&key, model, system, prompt),
        "openai" => openai_complete(&key, model, system, prompt),
        other => Err(format!("Unknown provider: {other}")),
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
