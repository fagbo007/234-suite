import { useState } from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import styles from './CollabPanel.module.css';

/** Structural shape of a presence peer (avoids a `@234/collab` dependency). */
export interface PresencePeerLike {
  clientId: number;
  user: { name: string; color: string };
}

export interface CollabPanelProps {
  active: boolean;
  code: string | null;
  onStart: () => void;
  onJoin: (code: string, relayUrl?: string) => string | null;
  onLeave: () => void;
  /** Remote collaborators in the session (shown as a roster when active). */
  peers?: PresencePeerLike[];
}

/**
 * Shared docked collaboration panel (root §6-style: user-invoked, optional).
 * Idle: start a session or join one with a code. Active: show the shareable code
 * + leave. App-agnostic — used by Sheet, Writer, and Slides.
 */
export function CollabPanel({
  active,
  code,
  onStart,
  onJoin,
  onLeave,
  peers = [],
}: CollabPanelProps) {
  const [codeInput, setCodeInput] = useState('');
  const [relayUrl, setRelayUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const join = () => {
    const message = onJoin(codeInput, relayUrl.trim() === '' ? undefined : relayUrl.trim());
    setError(message);
    if (!message) setCodeInput('');
  };

  return (
    <section className={styles.panel} aria-label="Collaboration">
      <h2 className={styles.title}>Collaborate</h2>

      {active ? (
        <div className={styles.active}>
          <p className={styles.hint}>Share this code so others can join:</p>
          <code className={styles.code} aria-label="Session code">
            {code}
          </code>
          {peers.length > 0 ? (
            <ul className={styles.roster} aria-label="Collaborators">
              {peers.map((peer) => (
                <li key={peer.clientId} className={styles.peer}>
                  {/* Inline colour is the peer's identity (data), not chrome. */}
                  <span className={styles.dot} style={{ background: peer.user.color }} aria-hidden />
                  {peer.user.name}
                </li>
              ))}
            </ul>
          ) : null}
          <Button variant="secondary" onClick={onLeave}>
            Leave session
          </Button>
        </div>
      ) : (
        <div className={styles.idle}>
          <Button onClick={onStart}>Start session</Button>
          <div className={styles.joinRow}>
            <Input
              label="Session code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="234-XXXX-XXXX"
            />
            <Input
              label="Relay URL (optional)"
              value={relayUrl}
              onChange={(event) => setRelayUrl(event.target.value)}
              placeholder="ws://localhost:1234"
            />
            <Button variant="secondary" onClick={join} disabled={codeInput.trim() === ''}>
              Join
            </Button>
          </div>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
