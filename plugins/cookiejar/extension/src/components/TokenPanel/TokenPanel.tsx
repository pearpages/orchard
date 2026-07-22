import { useEffect, useMemo, useState } from 'react';
import { formatExpiry } from '../../lib/format';
import { detectToken, isExpired, jwtTimes } from '../../lib/token';
import './token-panel.scss';

interface TokenPanelProps {
  value: string;
}

const REGISTERED_CLAIMS = ['iss', 'sub', 'aud'] as const;
const LIVE_WINDOW_MS = 60 * 60 * 1000;

/** Decoded view of a JWT / base64-JSON found inside a value. Renders nothing otherwise. */
export function TokenPanel({ value }: TokenPanelProps) {
  const token = useMemo(() => detectToken(value), [value]);
  const [copied, setCopied] = useState(false);
  // Re-render every second only while exp is close enough for a live countdown.
  const [, setTick] = useState(0);
  const exp = token?.kind === 'jwt' ? jwtTimes(token.jwt.payload).exp : undefined;

  useEffect(() => {
    if (!exp) return;
    if (Math.abs(exp.getTime() - Date.now()) > LIVE_WINDOW_MS) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [exp]);

  if (!token) return null;

  const copyDecoded = async () => {
    const decoded =
      token.kind === 'jwt'
        ? { header: token.jwt.header, payload: token.jwt.payload ?? token.jwt.payloadRaw }
        : token.json;
    await navigator.clipboard.writeText(JSON.stringify(decoded, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (token.kind === 'base64-json') {
    return (
      <div className="token-panel">
        <div className="token-panel__header">
          <span className="token-panel__kind">Base64 JSON</span>
          <button type="button" className="token-panel__copy" onClick={copyDecoded}>
            {copied ? 'Copied ✓' : 'Copy decoded'}
          </button>
        </div>
        <pre className="token-panel__json">{JSON.stringify(token.json, null, 2)}</pre>
      </div>
    );
  }

  const { jwt } = token;
  const times = jwtTimes(jwt.payload);
  const expired = isExpired(jwt.payload);

  return (
    <div className="token-panel">
      <div className="token-panel__header">
        <span className="token-panel__kind">JWT</span>
        {times.exp && (
          <span className={`token-panel__exp${expired ? ' token-panel__exp--expired' : ''}`}>
            {expired
              ? formatExpiry({ session: false, expirationDate: times.exp.getTime() / 1000 }).replace(
                  /^expired/,
                  'Expired',
                )
              : `Expires ${formatExpiry({ session: false, expirationDate: times.exp.getTime() / 1000 })}`}
          </span>
        )}
        <button type="button" className="token-panel__copy" onClick={copyDecoded}>
          {copied ? 'Copied ✓' : 'Copy decoded'}
        </button>
      </div>
      <dl className="token-panel__claims">
        {times.exp && (
          <>
            <dt>exp</dt>
            <dd title={times.exp.toISOString()}>{times.exp.toLocaleString()}</dd>
          </>
        )}
        {times.iat && (
          <>
            <dt>iat</dt>
            <dd>{times.iat.toLocaleString()}</dd>
          </>
        )}
        {times.nbf && (
          <>
            <dt>nbf</dt>
            <dd>{times.nbf.toLocaleString()}</dd>
          </>
        )}
        {REGISTERED_CLAIMS.map((claim) => {
          const v = jwt.payload?.[claim];
          if (v === undefined) return null;
          return (
            <div className="token-panel__claim" key={claim}>
              <dt>{claim}</dt>
              <dd>{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
            </div>
          );
        })}
      </dl>
      <details className="token-panel__section" open>
        <summary>Payload</summary>
        <pre className="token-panel__json">
          {jwt.payload ? JSON.stringify(jwt.payload, null, 2) : `(opaque payload) ${jwt.payloadRaw}`}
        </pre>
      </details>
      <details className="token-panel__section">
        <summary>Header</summary>
        <pre className="token-panel__json">{JSON.stringify(jwt.header, null, 2)}</pre>
      </details>
    </div>
  );
}
