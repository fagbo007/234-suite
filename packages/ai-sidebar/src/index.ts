// Shared AI sidebar — root CLAUDE.md §6 (the single most important design
// principle): AI lives in a collapsible, docked sidebar only. It never floats
// over content, never speaks first, and is only ever user-invoked. This rule
// cannot be overridden without a decision recorded in
// /docs/architecture/ai-sidebar.md.
//
// Phase 2 ships the scaffold — collapsible panel, no AI content. AI features go
// live (opt-in, optional) in Phase 3. AI is always optional: every app must be
// 100% usable with AI disabled.
export { AiSidebar, type AiSidebarProps } from './AiSidebar';
export { useAiSidebar, type UseAiSidebar } from './useAiSidebar';
