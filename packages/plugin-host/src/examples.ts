/**
 * Shipped example plugins (in-tree, MIT). They demonstrate the two seams and are
 * loaded by the apps (the sample provider) / exercised in tests (the command).
 * Both are offline and rule-compliant: the provider only feeds the existing
 * docked sidebar (§6), and the command title is sentence case (§5).
 */
import { definePlugin } from './host';

/**
 * The §6 Phase-4 hook in miniature: a plugin contributes an extra AI provider
 * the user can select in the docked sidebar. Offline + deterministic (an echo) —
 * it never reaches the network and has no surface of its own.
 */
export const sampleProviderPlugin = definePlugin({
  id: 'com.234.sample-provider',
  name: 'Sample echo provider',
  setup(host) {
    return host.registerAiProvider({
      id: 'sample-echo',
      label: 'Sample echo (plugin)',
      offline: true,
      complete: ({ prompt }) => Promise.resolve(`[plugin echo] ${prompt.trim()}`),
    });
  },
});

/** Demonstrates the command seam (exercised in tests; not loaded into the apps). */
export const sampleCommandPlugin = definePlugin({
  id: 'com.234.sample-command',
  name: 'Sample command',
  setup(host) {
    return host.registerCommand({
      id: 'plugin.sample',
      title: 'Sample plugin command',
      group: 'Help',
      run: () => console.info('[plugin] sample command ran'),
    });
  },
});
