import { describe, expect, it } from 'vitest';
import { type AiProvider } from '@234/ai-sidebar';
import { type Command } from '@234/shared';
import { loadPlugins, type LoadOptions } from './host';
import { sampleCommandPlugin, sampleProviderPlugin } from './examples';

function stubOpts() {
  const commands = new Map<string, Command>();
  const providers = new Map<string, AiProvider>();
  const opts: LoadOptions = {
    app: 'writer',
    registerCommand: (command) => {
      commands.set(command.id, command);
      return () => {
        commands.delete(command.id);
      };
    },
    registerAiProvider: (provider) => {
      providers.set(provider.id, provider);
      return () => {
        providers.delete(provider.id);
      };
    },
  };
  return { commands, providers, opts };
}

describe('example plugins', () => {
  it('registers the sample echo provider and a deterministic offline completion', async () => {
    const { providers, opts } = stubOpts();
    const teardown = loadPlugins([sampleProviderPlugin], opts);

    const provider = providers.get('sample-echo');
    expect(provider).toBeDefined();
    expect(provider?.offline).toBe(true);
    expect(await provider?.complete({ prompt: '  hi  ' })).toBe('[plugin echo] hi');

    teardown();
    expect(providers.has('sample-echo')).toBe(false);
  });

  it('registers the sample command via the command seam', () => {
    const { commands, opts } = stubOpts();
    const teardown = loadPlugins([sampleCommandPlugin], opts);
    expect(commands.get('plugin.sample')?.title).toBe('Sample plugin command');
    teardown();
    expect(commands.has('plugin.sample')).toBe(false);
  });
});
