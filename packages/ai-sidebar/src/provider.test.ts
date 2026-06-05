import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCloudProvider, createOllamaProvider, mockProvider } from './provider';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

type Win = Record<string, unknown>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mockProvider', () => {
  it('echoes deterministically offline (no network)', async () => {
    expect(mockProvider.offline).toBe(true);
    await expect(mockProvider.complete({ prompt: 'hello' })).resolves.toBe('[sample output] hello');
  });
});

describe('createOllamaProvider', () => {
  it('POSTs to /api/generate and returns the response text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'generated' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = createOllamaProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    const result = await provider.complete({ prompt: 'hi', system: 'be terse' });

    expect(result).toBe('generated');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:11434/api/generate');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      model: 'llama3',
      prompt: 'hi',
      system: 'be terse',
      stream: false,
    });
  });

  it('throws a friendly error when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const provider = createOllamaProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    await expect(provider.complete({ prompt: 'hi' })).rejects.toThrow(/Is it running/);
  });
});

describe('createCloudProvider', () => {
  afterEach(() => {
    delete (window as unknown as Win).__TAURI_INTERNALS__;
    invoke.mockReset();
  });

  it('runs the completion in Rust via ai_cloud_complete (key never enters JS)', async () => {
    (window as unknown as Win).__TAURI_INTERNALS__ = {};
    invoke.mockResolvedValueOnce('hello there');

    const provider = createCloudProvider('claude', 'Claude', 'claude-3-5-sonnet-latest');
    expect(provider.offline).toBe(false);

    await expect(provider.complete({ prompt: 'hi', system: 'be terse' })).resolves.toBe(
      'hello there',
    );
    expect(invoke).toHaveBeenCalledWith('ai_cloud_complete', {
      provider: 'claude',
      model: 'claude-3-5-sonnet-latest',
      system: 'be terse',
      prompt: 'hi',
    });
  });

  it('throws a friendly error (and never invokes) in the web build', async () => {
    const provider = createCloudProvider('openai', 'OpenAI', 'gpt-4o-mini');
    await expect(provider.complete({ prompt: 'hi' })).rejects.toThrow(/desktop app/i);
    expect(invoke).not.toHaveBeenCalled();
  });
});
