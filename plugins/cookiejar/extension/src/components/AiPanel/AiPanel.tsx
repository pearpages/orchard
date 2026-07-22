import { useState } from 'react';
import type { Cookie } from '../../lib/cookies';
import { AiUnavailableError, explainCookie, type AiProvider } from '../../lib/ai/ai';
import type { AiTurn } from '../../lib/ai/context';
import { AiSettingsDialog } from '../AiSettingsDialog/AiSettingsDialog';
import './ai-panel.scss';

interface AiPanelProps {
  cookie: Cookie;
}

const MAX_TURNS = 20;

export function AiPanel({ cookie }: AiPanelProps) {
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [followUp, setFollowUp] = useState('');

  const ask = async (question?: string) => {
    setLoading(true);
    setError(null);
    setNeedsSetup(false);
    try {
      const result = await explainCookie(cookie, turns.slice(-MAX_TURNS), question);
      setTurns([...result.turns, { role: 'assistant', content: result.answer.text }]);
      setProvider(result.answer.provider);
    } catch (e) {
      if (e instanceof AiUnavailableError) setNeedsSetup(true);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const started = turns.length > 0 || loading || needsSetup || error !== null;

  return (
    <div className="ai-panel">
      {!started && (
        <button type="button" className="ai-panel__explain" onClick={() => void ask()}>
          ✨ Explain this cookie
        </button>
      )}

      {turns.length > 0 && (
        <div className="ai-panel__conversation">
          {turns.map((turn, index) => (
            <div
              key={index}
              className={`ai-panel__turn ai-panel__turn--${turn.role}`}
            >
              {/* The first user turn embeds the metadata context — show a friendly label instead. */}
              {index === 0 && turn.role === 'user' ? 'What is this cookie about?' : turn.content}
            </div>
          ))}
        </div>
      )}

      {loading && <p className="ai-panel__loading">Thinking…</p>}

      {error && <p className="ai-panel__error">{error}</p>}

      {needsSetup && (
        <div className="ai-panel__setup">
          <p className="ai-panel__setup-text">
            No AI backend is set up yet. Add a Claude API key (works on any machine) or download
            Chrome's on-device model — both are in AI settings.
          </p>
          <button type="button" className="ai-panel__setup-button" onClick={() => setSettingsOpen(true)}>
            Set up AI…
          </button>
        </div>
      )}

      {started && !needsSetup && !loading && (
        <form
          className="ai-panel__follow-up"
          onSubmit={(e) => {
            e.preventDefault();
            const question = followUp.trim();
            if (!question) return;
            setFollowUp('');
            void ask(question);
          }}
        >
          <input
            className="ai-panel__input"
            type="text"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Ask a follow-up about this cookie…"
            aria-label="Follow-up question"
          />
          <button type="submit" className="ai-panel__send" disabled={!followUp.trim()}>
            Ask
          </button>
        </form>
      )}

      <p className="ai-panel__privacy">
        {provider && (
          <span className={`ai-panel__provider ai-panel__provider--${provider}`}>
            {provider === 'on-device' ? 'on-device AI' : 'Claude'}
          </span>
        )}
        Only cookie metadata is sent — never the value.
      </p>

      {settingsOpen && (
        <AiSettingsDialog
          onClose={() => {
            setSettingsOpen(false);
            setNeedsSetup(false);
          }}
        />
      )}
    </div>
  );
}
