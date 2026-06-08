import { Button, Input } from '@234/shared';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { type CloudProviderId, deleteKey, hasKey, isDesktop, setKey } from './keychain';
import { getProviders, subscribeProviders } from './providerRegistry';
import { type AiSettings as AiSettingsValue, type ProviderId } from './useAiSettings';
import styles from './AiSettings.module.css';

export interface AiSettingsProps {
  settings: AiSettingsValue;
  onChange: (next: AiSettingsValue) => void;
}

/**
 * Manages the API key for one cloud provider. The key is written to the OS
 * keychain via Rust and is **never read back** — we only store, clear, and show
 * whether a key is saved. In the web build (no Tauri) storage is unavailable.
 */
function KeyField({ provider }: { provider: CloudProviderId }) {
  const [keyInput, setKeyInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    hasKey(provider)
      .then(setSaved)
      .catch(() => setSaved(false));
  }, [provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!isDesktop()) {
    return <p className={styles.note}>Add an API key in the desktop app.</p>;
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setKey(provider, keyInput.trim());
      setKeyInput('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      await deleteKey(provider);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.field}>
      <Input
        label="API key"
        type="password"
        value={keyInput}
        placeholder={saved ? 'A key is saved' : 'Paste your API key'}
        onChange={(event) => setKeyInput(event.target.value)}
      />
      <div className={styles.keyRow}>
        <Button size="small" onClick={() => void save()} disabled={busy || keyInput.trim() === ''}>
          Save key
        </Button>
        {saved ? (
          <Button size="small" variant="ghost" onClick={() => void clear()} disabled={busy}>
            Clear key
          </Button>
        ) : null}
        <span className={styles.keyStatus}>{saved ? 'Key saved' : 'No key'}</span>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Compact provider settings inside the sidebar. Offline-first: the default is
 * "Off (sample text)"; "Local Ollama" needs a running local server but no API
 * key. Cloud providers (Claude / OpenAI) store their key in the OS keychain via
 * Rust — the key never enters JS or localStorage (root §6).
 */
export function AiSettings({ settings, onChange }: AiSettingsProps) {
  // Plugin-registered providers appear after the built-ins (root §6 Phase-4 hook).
  const registered = useSyncExternalStore(subscribeProviders, getProviders, getProviders);
  return (
    <div className={styles.settings}>
      <label className={styles.field}>
        <span className={styles.label}>Provider</span>
        <select
          className={styles.select}
          aria-label="AI provider"
          value={settings.provider}
          onChange={(event) => onChange({ ...settings, provider: event.target.value as ProviderId })}
        >
          <option value="mock">Off (sample text)</option>
          <option value="ollama">Local Ollama</option>
          <option value="claude">Claude</option>
          <option value="openai">OpenAI</option>
          {registered.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </select>
      </label>

      {settings.provider === 'ollama' ? (
        <>
          <Input
            label="Ollama server"
            value={settings.ollamaBaseUrl}
            onChange={(event) => onChange({ ...settings, ollamaBaseUrl: event.target.value })}
          />
          <Input
            label="Model"
            value={settings.ollamaModel}
            onChange={(event) => onChange({ ...settings, ollamaModel: event.target.value })}
          />
        </>
      ) : null}

      {settings.provider === 'claude' ? (
        <>
          <Input
            label="Model"
            value={settings.claudeModel}
            onChange={(event) => onChange({ ...settings, claudeModel: event.target.value })}
          />
          <KeyField provider="claude" />
        </>
      ) : null}

      {settings.provider === 'openai' ? (
        <>
          <Input
            label="Model"
            value={settings.openaiModel}
            onChange={(event) => onChange({ ...settings, openaiModel: event.target.value })}
          />
          <KeyField provider="openai" />
        </>
      ) : null}
    </div>
  );
}
