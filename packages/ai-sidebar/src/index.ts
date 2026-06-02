// Shared AI sidebar component.
//
// THE AI SIDEBAR RULE (root CLAUDE.md Section 6 — the single most important
// design principle): AI lives in a collapsible sidebar only. It never floats
// over content, never speaks first, and is only ever user-invoked. This rule
// cannot be overridden without a decision recorded in
// /docs/architecture/ai-sidebar.md.
//
// Scaffold lands in Phase 2 (collapsible panel, no AI content); AI features go
// live in Phase 3. Placeholder until then. AI is always optional — every app
// must be 100% usable with AI disabled.
export const AI_SIDEBAR_PLACEHOLDER = true;
