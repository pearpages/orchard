/**
 * Claude API backend (user's own key). The SDK is imported lazily so its
 * chunk only loads when the user actually asks Claude something.
 * `dangerouslyAllowBrowser` is appropriate here: the extension page is the
 * user's own environment and the key is their own, stored locally.
 */
import type { AiTurn } from './context';

export async function askClaude(
  apiKey: string,
  model: string,
  system: string,
  turns: AiTurn[],
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    });
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    if (!text) throw new Error('Claude returned an empty answer.');
    return text;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('Claude rejected the API key — check it in AI settings.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error('Claude rate limit hit — wait a moment and try again.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error('Could not reach the Claude API — check your connection.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${error.message}`);
    }
    throw error;
  }
}
