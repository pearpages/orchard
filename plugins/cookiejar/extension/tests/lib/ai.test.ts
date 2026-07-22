import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiUnavailableError, explainCookie } from '../../src/lib/ai/ai';
import { saveAiSettings } from '../../src/lib/ai/settings';
import { makeCookie } from '../chromeMock';
import * as chromeAi from '../../src/lib/ai/chromeAi';
import * as claudeAi from '../../src/lib/ai/claudeAi';

vi.mock('../../src/lib/ai/chromeAi', () => ({
  builtInAvailability: vi.fn(),
  promptBuiltIn: vi.fn(),
}));
vi.mock('../../src/lib/ai/claudeAi', () => ({
  askClaude: vi.fn(),
}));

const availability = vi.mocked(chromeAi.builtInAvailability);
const promptBuiltIn = vi.mocked(chromeAi.promptBuiltIn);
const askClaude = vi.mocked(claudeAi.askClaude);

const cookie = makeCookie({ name: '_ga', domain: '.example.com' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('explainCookie routing', () => {
  it('uses on-device AI when preferred and available', async () => {
    availability.mockResolvedValue('available');
    promptBuiltIn.mockResolvedValue('on-device answer');
    const { answer } = await explainCookie(cookie, []);
    expect(answer.provider).toBe('on-device');
    expect(answer.text).toBe('on-device answer');
    expect(askClaude).not.toHaveBeenCalled();
  });

  it('falls back to Claude when on-device is unavailable and a key is set', async () => {
    availability.mockResolvedValue('unavailable');
    askClaude.mockResolvedValue('claude answer');
    await saveAiSettings({ claudeApiKey: 'sk-ant-test' });
    const { answer } = await explainCookie(cookie, []);
    expect(answer.provider).toBe('claude');
    expect(answer.text).toBe('claude answer');
    expect(promptBuiltIn).not.toHaveBeenCalled();
  });

  it('throws AiUnavailableError when neither backend is configured', async () => {
    availability.mockResolvedValue('unavailable');
    await expect(explainCookie(cookie, [])).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it('falls back to Claude when on-device throws mid-call and a key is set', async () => {
    availability.mockResolvedValue('available');
    promptBuiltIn.mockRejectedValue(new Error('device model crashed'));
    askClaude.mockResolvedValue('claude rescue');
    await saveAiSettings({ claudeApiKey: 'sk-ant-test' });
    const { answer } = await explainCookie(cookie, []);
    expect(answer.provider).toBe('claude');
    expect(answer.text).toBe('claude rescue');
  });

  it('passes cookie context in the first turn and appends follow-ups', async () => {
    availability.mockResolvedValue('available');
    promptBuiltIn.mockResolvedValue('answer');
    const first = await explainCookie(cookie, []);
    expect(first.turns[0].content).toContain('Cookie name: _ga');
    const history = [...first.turns, { role: 'assistant' as const, content: 'answer' }];
    const second = await explainCookie(cookie, history, 'Is it a tracker?');
    const lastTurn = second.turns[second.turns.length - 1];
    expect(lastTurn.content).toBe('Is it a tracker?');
  });
});
