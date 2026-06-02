# CLAUDE.md — Shared design system

> App-specific context for `/apps/shared` — the shared design system and
> component library used by Writer, Sheet, and Slides. Read this together with
> the root `/CLAUDE.md`. The root file is the single source of truth; this file
> adds design-system specifics. Do not deviate from either without raising a
> question first.

Scope owner: **Design agent** (`/apps/shared`). See root Section 13.

> **Never duplicate a shared component inside an app.** If a component is needed
> by two or more apps, it belongs in `apps/shared/components` (root Section 4).

---

## 1. Design system rules (mirrors root Section 5 — non-negotiable)

- **Dark mode is mandatory.** Every new component must work in both light and
  dark mode before it can be merged. Use CSS custom properties only — **no
  hardcoded hex values** in component styles.
- **Accessible by default.** Every interactive element needs an `aria-label` if
  it has no visible text. Focus states must be visible. Never ship a component
  with `outline: none` without an equivalent focus indicator.
- **Context-adaptive UI.** The command palette is the primary navigation
  surface. Show only commands relevant to the current selection state. **No
  ribbon-style toolbars** that show all commands at all times.
- **Sentence case everywhere.** All labels, menu items, button text, headings —
  sentence case. Never Title Case or ALL CAPS in UI text.
- **Icons:** Tabler **outline** icons only (`@tabler/icons-react`). Never use
  filled variants. Never hand-draw icon paths.
- **Type scale:** 14px body, 16px emphasis, 12px secondary/metadata. **Two
  weights only:** 400 regular and 500 medium. Never 600 or 700.
- **Border radius:** 8px for interactive elements, 12px for cards. Pills only
  when semantically a pill.
- **No gradients, no drop shadows** on UI chrome. Flat surfaces only.

---

## 2. CSS custom property naming convention

All visual values are CSS custom properties (design tokens) defined in
`/apps/shared/design-tokens`. No component may hardcode a colour, size, or
radius. The post-edit hook warns on any hardcoded hex (root Section 12).

Convention: `--<category>-<role>[-<variant>][-<state>]`, kebab-case.

```css
/* Colour — semantic roles, never raw colour names in components */
--color-bg-base
--color-bg-surface
--color-bg-elevated
--color-fg-primary
--color-fg-secondary      /* 12px metadata text */
--color-fg-muted
--color-accent
--color-accent-hover
--color-border
--color-focus-ring        /* visible focus indicator */
--color-danger

/* Typography */
--font-size-body          /* 14px */
--font-size-emphasis      /* 16px */
--font-size-meta          /* 12px */
--font-weight-regular     /* 400 */
--font-weight-medium      /* 500 */

/* Spacing — base-4 scale */
--space-1 ... --space-8

/* Radius */
--radius-interactive      /* 8px */
--radius-card             /* 12px */
```

- Light and dark are two value sets for the **same token names** (e.g. toggled
  by `[data-theme="dark"]`). Components reference token names only and therefore
  get dark mode for free — never branch on theme inside a component.
- Add new tokens to the token file, never inline a literal value in a component.

---

## 3. Component file structure template

Each component lives in its own folder under `/apps/shared/components`:

```
/apps/shared/components/
└── Button/
    ├── Button.tsx          ← component (tokens only, no hex, no inline theme branch)
    ├── Button.module.css   ← styles using CSS custom properties only
    ├── Button.test.tsx     ← REQUIRED (post-edit hook warns if absent)
    └── index.ts            ← re-export
```

Rules:
- Every component ships with a `.test.tsx` (root Section 12, hook 5).
- Interactive elements without visible text carry an `aria-label`
  (root Section 12, hook 4).
- Styles reference design tokens only — never a raw hex (root Section 12, hook 3).
- Verify the component in **both light and dark mode** before considering it
  done (Section 4).

---

## 4. Dark mode testing requirement

A component is not done until it has been confirmed working in **both light and
dark mode** (root Section 5, Section 15 Step 2). Dark mode is the default theme
for the suite. Tests should cover both theme states where appearance differs.

---

## 5. Icon usage rules

- Use **`@tabler/icons-react`**, **outline** variants only. (Installed as a
  dependency of `@234/shared` in Phase 1, Step 2.)
- Never filled variants. Never hand-drawn icon paths.
- Wrap Tabler icons in the shared `Icon` component so sizing, stroke, and
  `aria-label` handling are consistent.
- An icon-only control must have an `aria-label` (the `Icon` `label` prop sets
  it; without `label` the icon is decorative `aria-hidden`).

```tsx
import { Icon } from '@234/shared';
import { IconSearch } from '@tabler/icons-react';

// Decorative (inside a labelled control):
<Icon icon={IconSearch} />
// Icon-only control — provide an accessible name:
<button aria-label="Search"><Icon icon={IconSearch} /></button>
// Or let the Icon carry the name:
<Icon icon={IconSearch} label="Search" />
```

---

## 6. Command palette API

The command palette is the **primary navigation surface** (root Section 5) and
must be wired into all three apps in Phase 1 (root Section 15 Step 2).

- Trigger: **Cmd+K (macOS) / Ctrl+K (Windows, Linux)**.
- Fuzzy search over registered commands; full keyboard navigation
  (arrow keys + Enter, Esc to dismiss); visible focus state on the active item.
- **Context-adaptive:** show only commands relevant to the current selection
  state — never the full command list as a ribbon.

Sketch of the registration contract (final shape recorded during Step 2):

```ts
interface Command {
  id: string;
  title: string;              // sentence case
  icon?: TablerIcon;          // outline only
  group?: string;
  isAvailable?(ctx: SelectionContext): boolean;  // context-adaptive filter
  run(ctx: SelectionContext): void;
}

registerCommand(command: Command): void;
```

Each app registers its own commands; the palette component itself is shared and
lives here, never duplicated per app.

---

## 7. Commands

```bash
pnpm test:shared     # unit / integration tests (Vitest) for shared components
```

---

## 8. Phase 1 deliverables (root Section 9 / Section 15 Step 2)

- [ ] CSS custom properties: colour tokens (light + dark), type scale, spacing
- [ ] Base components: Button, Input, Icon (Tabler wrapper)
- [ ] Command palette: Cmd+K / Ctrl+K trigger, fuzzy search, keyboard navigation
- [ ] Dark mode confirmed in all components before proceeding
- [ ] Tabler icon library installed and documented
- [ ] AI sidebar scaffold is a **Phase 2** deliverable — not built in Phase 1
