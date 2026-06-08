import { describe, expect, it, vi } from 'vitest';
import { type AiProvider } from '@234/ai-sidebar';
import { type Command } from '@234/shared';
import { definePlugin, loadPlugins, type LoadOptions } from './host';

/** A stub host backed by plain maps, mirroring the real registries' contract. */
function stubOpts(app = 'writer') {
  const commands = new Map<string, Command>();
  const providers = new Map<string, AiProvider>();
  const opts: LoadOptions = {
    app,
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

describe('loadPlugins', () => {
  it('registers a command and an AI provider via the host', () => {
    const { commands, providers, opts } = stubOpts('sheet');
    const seenApp = vi.fn();
    loadPlugins(
      [
        definePlugin({
          id: 'a',
          name: 'A',
          setup(host) {
            seenApp(host.app);
            host.registerCommand({ id: 'a.cmd', title: 'A command', run: () => {} });
            host.registerAiProvider({
              id: 'a.prov',
              label: 'A provider',
              offline: true,
              complete: () => Promise.resolve(''),
            });
          },
        }),
      ],
      opts,
    );
    expect(commands.has('a.cmd')).toBe(true);
    expect(providers.has('a.prov')).toBe(true);
    expect(seenApp).toHaveBeenCalledWith('sheet');
  });

  it('skips a duplicate plugin id (loads each once)', () => {
    const { commands, opts } = stubOpts();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setup = vi.fn((host) => host.registerCommand({ id: 'dup.cmd', title: 'Dup', run: () => {} }));
    const make = () => definePlugin({ id: 'dup', name: 'Dup', setup });
    loadPlugins([make(), make()], opts);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(commands.size).toBe(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('isolates a plugin that throws in setup (others still load)', () => {
    const { commands, opts } = stubOpts();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadPlugins(
      [
        definePlugin({
          id: 'bad',
          name: 'Bad',
          setup(host) {
            host.registerCommand({ id: 'bad.cmd', title: 'Bad', run: () => {} });
            throw new Error('boom');
          },
        }),
        definePlugin({
          id: 'good',
          name: 'Good',
          setup: (host) => host.registerCommand({ id: 'good.cmd', title: 'Good', run: () => {} }),
        }),
      ],
      opts,
    );
    // The thrower's partial registration is rolled back; the next plugin loads.
    expect(commands.has('bad.cmd')).toBe(false);
    expect(commands.has('good.cmd')).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('teardown removes every contribution (returned teardown + auto-tracked)', () => {
    const { commands, providers, opts } = stubOpts();
    const teardown = loadPlugins(
      [
        definePlugin({
          id: 'with-teardown',
          name: 'With teardown',
          // Returns its command unregister explicitly.
          setup: (host) => host.registerCommand({ id: 't.cmd', title: 'T', run: () => {} }),
        }),
        definePlugin({
          id: 'no-teardown',
          name: 'No teardown',
          // Returns nothing — the host still tracks the provider for teardown.
          setup(host) {
            host.registerAiProvider({
              id: 't.prov',
              label: 'T provider',
              offline: true,
              complete: () => Promise.resolve(''),
            });
          },
        }),
      ],
      opts,
    );
    expect(commands.has('t.cmd')).toBe(true);
    expect(providers.has('t.prov')).toBe(true);

    teardown();
    expect(commands.has('t.cmd')).toBe(false);
    expect(providers.has('t.prov')).toBe(false);
  });
});
