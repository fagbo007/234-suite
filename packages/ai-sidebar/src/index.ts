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
export {
  type AiProvider,
  type AiRequest,
  type OllamaConfig,
  mockProvider,
  createOllamaProvider,
  createCloudProvider,
} from './provider';
export {
  type CloudProviderId,
  isDesktop,
  hasKey,
  setKey,
  deleteKey,
} from './keychain';
export {
  useAiSettings,
  DEFAULT_AI_SETTINGS,
  type AiSettings as AiSettingsValue,
  type ProviderId,
  type UseAiSettings,
} from './useAiSettings';
export { AiActionPanel, type AiAction, type AiActionPanelProps } from './AiActionPanel';
export { AiSettings, type AiSettingsProps } from './AiSettings';
export { registerProvider, getProviders, subscribeProviders } from './providerRegistry';
