import { Input } from '@234/shared';
import { type AiSettings as AiSettingsValue, type ProviderId } from './useAiSettings';
import styles from './AiSettings.module.css';

export interface AiSettingsProps {
  settings: AiSettingsValue;
  onChange: (next: AiSettingsValue) => void;
}

/**
 * Compact provider settings inside the sidebar. Offline-first: the default is
 * "Off (sample text)"; "Local Ollama" needs a running local server but no API
 * key. Cloud providers + key storage arrive with the Tauri window (root §6) —
 * deliberately no API-key field here.
 */
export function AiSettings({ settings, onChange }: AiSettingsProps) {
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
    </div>
  );
}
