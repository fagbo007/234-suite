import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOllamaProvider, mockProvider } from './provider';

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
