/** Orchestrates the AI backends: on-device first (if preferred), Claude fallback. */
import type { Cookie } from '../cookies';
import { buildInitialQuestion, SYSTEM_PROMPT, type AiTurn } from './context';
import { builtInAvailability, promptBuiltIn } from './chromeAi';
import { askClaude } from './claudeAi';
import { loadAiSettings } from './settings';

export type AiProvider = 'on-device' | 'claude';

export interface AiAnswer {
  text: string;
  provider: AiProvider;
}

/** Thrown when no backend is usable — the UI offers setup. */
export class AiUnavailableError extends Error {
  constructor() {
    super(
      "No AI backend is set up yet. Add a Claude API key (works on any machine) or download Chrome's on-device model — both are in AI settings.",
    );
    this.name = 'AiUnavailableError';
  }
}

/**
 * Answers a question about a cookie. `history` holds previous turns of this
 * conversation (first user turn already contains the cookie context);
 * pass an empty history plus optional `question` to start one.
 */
export async function explainCookie(
  cookie: Cookie,
  history: AiTurn[],
  question?: string,
): Promise<{ answer: AiAnswer; turns: AiTurn[] }> {
  const userTurn: AiTurn = {
    role: 'user',
    content:
      history.length === 0 ? buildInitialQuestion(cookie, question) : (question ?? '').trim(),
  };
  const turns = [...history, userTurn];

  const settings = await loadAiSettings();
  const hasKey = settings.claudeApiKey.trim().length > 0;
  const tryBuiltIn = settings.preferBuiltIn && (await builtInAvailability()) === 'available';

  if (tryBuiltIn) {
    try {
      const text = await promptBuiltIn(SYSTEM_PROMPT, turns);
      return { answer: { text, provider: 'on-device' }, turns };
    } catch (error) {
      // On-device failed mid-call — fall through to Claude if we can.
      if (!hasKey) throw error;
    }
  }

  if (hasKey) {
    const text = await askClaude(settings.claudeApiKey.trim(), settings.claudeModel, SYSTEM_PROMPT, turns);
    return { answer: { text, provider: 'claude' }, turns };
  }

  throw new AiUnavailableError();
}
