# Security policy

## Supported versions

Project 234 is pre-release and moves fast. Security fixes land on **`main`**;
there are no maintained release branches yet. Once versioned releases exist, this
section will list which are supported.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately to the maintainers (use GitHub's *"Report a vulnerability"* /
private security advisory on the repository). Include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- affected app(s) and version/commit.

We'll acknowledge your report, investigate, and keep you updated on the fix and
disclosure timeline. Please give us a reasonable window to address it before any
public disclosure.

## Scope & posture

234's design reduces the security surface by default — useful context when
assessing a report:

- **Offline-first, no account.** The apps run fully offline; there is **no
  telemetry without explicit opt-in** (root `CLAUDE.md` §1).
- **AI is optional and local-first.** The AI sidebar defaults to an offline mock
  provider; the only network call in the current build is to a user-configured
  local Ollama server. Cloud providers and API-key storage are not shipped yet.
- **Secrets are never stored in plaintext.** When cloud AI key storage lands, keys
  use the OS keychain (encrypted-file fallback) — never plaintext (§6).
- **MS Office import** parses untrusted `.docx`/`.xlsx`/`.pptx` (ZIP + XML) via
  `@234/compat`; parser-robustness reports are in scope.

## Recognition

We're happy to credit reporters in the changelog/advisory unless you prefer to
remain anonymous.
