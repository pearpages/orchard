import { afterEach, describe, expect, it, vi } from 'vitest';
import { builtInStatus, downloadBuiltIn, promptBuiltIn } from '../../src/lib/ai/chromeAi';

function setLanguageModel(value: unknown) {
  Object.defineProperty(globalThis, 'LanguageModel', { value, configurable: true, writable: true });
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).LanguageModel;
});

describe('builtInStatus', () => {
  it('reports no-api when the global is absent', async () => {
    expect(await builtInStatus()).toEqual({ state: 'unavailable', reason: 'no-api' });
  });

  it('maps availability() results to states', async () => {
    setLanguageModel({ availability: vi.fn().mockResolvedValue('available') });
    expect(await builtInStatus()).toEqual({ state: 'available', reason: 'ready' });

    setLanguageModel({ availability: vi.fn().mockResolvedValue('downloadable') });
    expect(await builtInStatus()).toEqual({ state: 'downloadable', reason: 'downloadable' });

    setLanguageModel({ availability: vi.fn().mockResolvedValue('downloading') });
    expect(await builtInStatus()).toEqual({ state: 'downloadable', reason: 'downloadable' });

    setLanguageModel({ availability: vi.fn().mockResolvedValue('unavailable') });
    expect(await builtInStatus()).toEqual({ state: 'unavailable', reason: 'unavailable' });
  });

  it('degrades to unavailable when availability() throws', async () => {
    setLanguageModel({ availability: vi.fn().mockRejectedValue(new Error('boom')) });
    expect(await builtInStatus()).toEqual({ state: 'unavailable', reason: 'unavailable' });
  });
});

describe('downloadBuiltIn', () => {
  it('creates a session with a monitor and forwards download progress', async () => {
    const destroy = vi.fn();
    let fireProgress: ((e: { loaded: number }) => void) | undefined;
    const create = vi.fn(async (options: { monitor?: (m: unknown) => void }) => {
      options.monitor?.({
        addEventListener: (_type: string, listener: (e: { loaded: number }) => void) => {
          fireProgress = listener;
        },
      });
      return { destroy, prompt: vi.fn() };
    });
    setLanguageModel({ availability: vi.fn(), create });

    const progress: number[] = [];
    const promise = downloadBuiltIn((loaded) => progress.push(loaded));
    fireProgress?.({ loaded: 0.5 });
    await promise;

    expect(create).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(progress).toContain(0.5);
  });

  it('throws a friendly error when the global is absent', async () => {
    await expect(downloadBuiltIn()).rejects.toThrow(/doesn't expose/);
  });
});

describe('promptBuiltIn', () => {
  it('seeds initial prompts and returns the answer', async () => {
    const destroy = vi.fn();
    const prompt = vi.fn().mockResolvedValue('the answer');
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    setLanguageModel({ availability: vi.fn(), create });

    const result = await promptBuiltIn('system', [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'second' },
    ]);

    expect(result).toBe('the answer');
    expect(prompt).toHaveBeenCalledWith('second');
    expect(create).toHaveBeenCalledWith({
      initialPrompts: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
      ],
    });
    expect(destroy).toHaveBeenCalledOnce();
  });
});
