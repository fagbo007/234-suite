# App shell architecture

> Decision record for how Project 234 packages and runs its three apps.
> Populated in Phase 1, Step 1 (root `CLAUDE.md` Section 15). Cross-references
> Section 3.2 (App shell architecture) and the Section 17 decision log.

---

## 1. Shipping model (decided — Section 3.2 / Section 17)

The suite ships as a **single installer** containing all three apps, with a
**launcher** to open Writer, Sheet, or Slides. Each app is **also available as a
standalone binary** (a user can install only Writer).

The three apps run as **three isolated processes**: a crash in Sheet must not
affect Writer or Slides. This is the central constraint the shell exists to
satisfy.

**Rationale:** balances consumer convenience (one install, all three apps)
against process isolation (crash containment). Installer size is acceptable
because users receive the full suite.

**Rejected alternatives:** three fully separate binaries (more isolated, worse
consumer UX); a single shared process (simpler, but no crash isolation).

### Installer packages (built in later phases)

| Platform | Suite installer | Per-app option |
|---|---|---|
| macOS | `.dmg` (234 suite) | per-app `.app` / `.dmg` |
| Windows | NSIS `.exe` suite | per-app `.exe` |
| Linux | `.AppImage` suite | per-app `.AppImage`, `.deb` |

Installer/packaging work is **Phase 4** (root Section 9). It is recorded here for
context but not built in Phase 1.

---

## 2. Process & technology model

- **Desktop shell:** Tauri 2 + Rust. Each app is its own Tauri application
  (its own window + Rust backend), giving OS-level process isolation for free.
- **UI:** React 18 + TypeScript. The frontend handles UI only.
- **Backend split (Section 3.5):** the Rust backend owns file I/O, the formula
  engine work, and any CPU-intensive task. Ask before adding a Node.js
  subprocess that could live in Rust.
- **Launcher:** a lightweight entry surface that lets the user pick an app; it
  spawns the chosen app as a separate process. Detailed launcher design is
  recorded here as it is built (Steps 3-5).

```
                ┌─────────────┐
                │  Launcher   │   (suite installer entry point)
                └──────┬──────┘
        spawns isolated processes (no shared memory)
     ┌─────────────┬──┴───────────┬─────────────┐
     ▼             ▼              ▼
┌─────────┐   ┌─────────┐    ┌─────────┐
│ Writer  │   │  Sheet  │    │ Slides  │   each = Tauri app
│ React + │   │ React + │    │ React + │   (own window + Rust backend)
│  Rust   │   │  Rust   │    │  Rust   │
└─────────┘   └─────────┘    └─────────┘
        shared design system: apps/shared (no duplication)
```

---

## 3. Phase 1, Step 1 decision — structure-first scaffold

For the repository scaffold we deliberately build the **workspace structure,
tooling, CI, and thin runnable React placeholders** for each app, and **defer**
the following to later Phase 1 steps:

- The actual `src-tauri` Rust backends and Tauri windows — these are themselves
  Steps 3-5 deliverables ("Tauri window, React shell"), so wiring them now would
  front-load later work and add a heavy system-level Rust toolchain dependency.
- Installer/launcher binaries — Phase 4.

**Rationale:** honours the Phase 1 mandate of "thin, correct, benchmarked" and
the rule "never add a later-phase feature early" (Section 15, Section 16). The
scaffold proves the monorepo installs, type-checks, lints, and tests cleanly on
all three platforms before any app logic is written.

### Toolchain note

- Built with **pnpm workspaces** (via Node's built-in corepack), **TypeScript
  strict**, **Vitest** (unit), **Playwright** (E2E), and **GitHub Actions** CI
  across Windows / macOS / Linux.
- **Tauri CLI (`@tauri-apps/cli` v2) is installed for Writer.** Rust/cargo are
  still not installed, and — importantly — the **MSVC C++ Build Tools are absent**
  on this machine (confirmed by `tauri info`: WebView2 ✔, MSVC ✘, rustc ✘).

### 3a. Writer `src-tauri` scaffold (2026-06-02)

234 Writer now has a wired Tauri v2 backend (`apps/writer/src-tauri/`):

```
src-tauri/
  Cargo.toml            # tauri v2 + tauri-build; lib crate writer_lib
  build.rs              # tauri_build::build()
  tauri.conf.json       # devUrl http://localhost:5173, frontendDist ../dist,
                        # beforeDevCommand/beforeBuildCommand → pnpm
  src/main.rs           # calls writer_lib::run()
  src/lib.rs            # tauri::Builder window host
  capabilities/default.json   # core:default for the "main" window
  icons/README.md       # run `tauri icon <source>` to generate (not committed)
```

`pnpm --filter @234/writer tauri info` detects the config (React + Vite). The
**native compile/window is deferred** — see prerequisites below.

### Prerequisites to actually build/run a Tauri window (per platform)

- **All:** Rust toolchain via rustup (`rustc`, `cargo`); app icons
  (`tauri icon <source.png>`).
- **Windows:** **MSVC C++ Build Tools** (Visual Studio Build Tools — `cl.exe`,
  Windows SDK; multi-GB, admin install) + WebView2 runtime (present here).
- **macOS:** Xcode Command Line Tools. **Linux:** `webkit2gtk` + build essentials.

Sheet and Slides get the same `src-tauri` treatment once Writer's window is
verified on an MSVC/Rust-equipped machine; then the launcher spawn mechanism.

---

## 4. Current repository layout (Step 1)

```
apps/
  writer/   sheet/   slides/   # Tauri apps (React placeholder shells today)
  shared/                      # shared design system (Step 2)
packages/
  formula-engine/              # named-ref translation layer (Step 4)
  compat/                      # MS Office round-trip (Phase 3)
  ai-sidebar/                  # AI sidebar component (Phase 2/3)
docs/architecture/app-shell.md # this file
```

---

## 5. Open follow-ups (track as the shell is built)

- `src-tauri` for **Sheet and Slides** (Writer is scaffolded — §3a); shared Tauri
  config conventions. Native window build pending an MSVC/Rust-equipped host.
- Launcher implementation and how it spawns/standalone-detects each app.
- Pre-commit and post-edit hooks (Section 12) — not part of the Step 1 checklist;
  wire when the test/benchmark commands they depend on exist.
- Packaging pipeline for the installer matrix (Phase 4).
