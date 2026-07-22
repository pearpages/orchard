/**
 * Chrome built-in AI (Gemini Nano, Prompt API). Fully on-device — nothing
 * leaves the machine. Availability depends on Chrome version, hardware and
 * model download state; every failure degrades to "unavailable".
 *
 * Requirements (Chrome 138+): a supported desktop OS, ~22 GB free disk, a
 * 4 GB+ VRAM GPU, and chrome://flags/#prompt-api-for-gemini-nano enabled. The
 * model must also be downloaded — availability() returns "downloadable" until
 * then, which is why `downloadBuiltIn` exists.
 */
import type { AiTurn } from './context';

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options?: {
    initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[];
    monitor?: (monitor: DownloadMonitor) => void;
  }): Promise<LanguageModelSession>;
}

function languageModel(): LanguageModelStatic | null {
  const lm = (globalThis as Record<string, unknown>).LanguageModel;
  return lm ? (lm as LanguageModelStatic) : null;
}

export type BuiltInAvailability = 'available' | 'downloadable' | 'unavailable';

/** Why on-device AI is (or isn't) usable — drives the settings guidance. */
export type BuiltInReason = 'ready' | 'downloadable' | 'no-api' | 'unavailable';

export interface BuiltInStatus {
  state: BuiltInAvailability;
  reason: BuiltInReason;
}

export async function builtInStatus(): Promise<BuiltInStatus> {
  const lm = languageModel();
  if (!lm) return { state: 'unavailable', reason: 'no-api' };
  try {
    const availability = await lm.availability();
    if (availability === 'available') return { state: 'available', reason: 'ready' };
    if (availability === 'downloadable' || availability === 'downloading') {
      return { state: 'downloadable', reason: 'downloadable' };
    }
    return { state: 'unavailable', reason: 'unavailable' };
  } catch {
    return { state: 'unavailable', reason: 'unavailable' };
  }
}

export async function builtInAvailability(): Promise<BuiltInAvailability> {
  return (await builtInStatus()).state;
}

/**
 * Triggers the Gemini Nano download and resolves once it's ready. Must be
 * called from a user gesture (button click). Reports byte-progress (0..1).
 */
export async function downloadBuiltIn(onProgress?: (loaded: number) => void): Promise<void> {
  const lm = languageModel();
  if (!lm) throw new Error("This Chrome doesn't expose the on-device AI API.");
  try {
    const session = await lm.create({
      monitor: (monitor) => {
        monitor.addEventListener('downloadprogress', (event) => onProgress?.(event.loaded));
      },
    });
    session.destroy();
  } catch (error) {
    throw new Error(
      `Could not download the on-device model: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** One-shot prompt against the on-device model with full conversation context. */
export async function promptBuiltIn(system: string, turns: AiTurn[]): Promise<string> {
  const lm = languageModel();
  if (!lm) throw new Error('Built-in AI is not available.');
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user') throw new Error('Conversation must end with a user turn.');
  const session = await lm.create({
    initialPrompts: [
      { role: 'system', content: system },
      ...turns.slice(0, -1).map((t) => ({ role: t.role, content: t.content })),
    ],
  });
  try {
    return await session.prompt(last.content);
  } finally {
    session.destroy();
  }
}
