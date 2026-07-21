import { useMemo, useState } from 'react';
import { bareDomain, type Cookie } from '../../lib/cookies';
import { SAME_SITE_LABELS, formatExpiry, formatExpiryAbsolute, truncate } from '../../lib/format';
import { detectToken } from '../../lib/token';
import { TokenPanel } from '../TokenPanel/TokenPanel';
import './cookie-row.scss';

interface CookieRowProps {
  cookie: Cookie;
  isProtected: boolean;
  showDomain?: boolean;
  onDelete: (cookie: Cookie) => void;
  onEdit: (cookie: Cookie) => void;
  onToggleProtect: (cookie: Cookie) => void;
}

export function CookieRow({ cookie, isProtected, showDomain, onDelete, onEdit, onToggleProtect }: CookieRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = useMemo(() => detectToken(cookie.value), [cookie.value]);

  const copyValue = async () => {
    await navigator.clipboard.writeText(cookie.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li className={`cookie-row${expanded ? ' cookie-row--expanded' : ''}`}>
      <div
        className="cookie-row__summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="cookie-row__id">
          <code className="cookie-row__name" title={cookie.name}>
            {cookie.name}
          </code>
          {showDomain && <span className="cookie-row__domain">{bareDomain(cookie.domain)}</span>}
        </div>
        <code className="cookie-row__value" title="Click row to expand">
          {truncate(cookie.value, 48)}
        </code>
        <span className="cookie-row__expiry" title={formatExpiryAbsolute(cookie)}>
          {formatExpiry(cookie)}
        </span>
        <span className="cookie-row__badges">
          {isProtected && (
            <span className="cookie-row__badge cookie-row__badge--shield" title="Protected — bulk deletes skip this cookie">
              🔒
            </span>
          )}
          {cookie.partitionKey?.topLevelSite && (
            <span
              className="cookie-row__badge cookie-row__badge--partition"
              title={`Partitioned under ${cookie.partitionKey.topLevelSite}`}
            >
              ⧉
            </span>
          )}
          {token?.kind === 'jwt' && (
            <span className="cookie-row__badge cookie-row__badge--jwt" title="Value contains a JWT">
              JWT
            </span>
          )}
          {cookie.secure && <span className="cookie-row__badge">Secure</span>}
          {cookie.httpOnly && <span className="cookie-row__badge">HttpOnly</span>}
          {cookie.sameSite !== 'unspecified' && (
            <span className="cookie-row__badge">SameSite={SAME_SITE_LABELS[cookie.sameSite]}</span>
          )}
        </span>
        <span className="cookie-row__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`cookie-row__action${isProtected ? ' cookie-row__action--active' : ''}`}
            title={isProtected ? 'Unprotect' : 'Protect from bulk delete'}
            aria-label={isProtected ? `Unprotect ${cookie.name}` : `Protect ${cookie.name}`}
            onClick={() => onToggleProtect(cookie)}
          >
            {isProtected ? '🛡' : '🛡'}
          </button>
          <button
            type="button"
            className="cookie-row__action"
            title="Edit"
            aria-label={`Edit ${cookie.name}`}
            onClick={() => onEdit(cookie)}
          >
            ✎
          </button>
          <button
            type="button"
            className="cookie-row__action cookie-row__action--danger"
            title="Delete"
            aria-label={`Delete ${cookie.name}`}
            onClick={() => onDelete(cookie)}
          >
            ×
          </button>
        </span>
      </div>
      {expanded && (
        <div className="cookie-row__detail">
          <div className="cookie-row__detail-value">
            <code>{cookie.value || '(empty value)'}</code>
            <button type="button" className="cookie-row__copy" onClick={copyValue}>
              {copied ? 'Copied ✓' : 'Copy value'}
            </button>
          </div>
          {token && <TokenPanel value={cookie.value} />}
          <dl className="cookie-row__meta">
            <dt>Domain</dt>
            <dd>
              <code>{cookie.domain}</code> {cookie.hostOnly ? '(host-only)' : ''}
            </dd>
            <dt>Path</dt>
            <dd>
              <code>{cookie.path}</code>
            </dd>
            <dt>Expires</dt>
            <dd>{formatExpiryAbsolute(cookie)}</dd>
            <dt>SameSite</dt>
            <dd>{SAME_SITE_LABELS[cookie.sameSite]}</dd>
            {cookie.partitionKey?.topLevelSite && (
              <>
                <dt>Partition</dt>
                <dd>
                  <code>{cookie.partitionKey.topLevelSite}</code>
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </li>
  );
}
