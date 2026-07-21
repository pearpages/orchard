import { useState } from 'react';
import type { Cookie } from '../../lib/cookies';
import type { DomainGroup as DomainGroupData } from '../../lib/filter';
import { CookieTable } from '../CookieTable/CookieTable';
import './domain-group.scss';

interface DomainGroupProps {
  group: DomainGroupData;
  domainProtected: boolean;
  isProtected: (cookie: Cookie) => boolean;
  onTogglePin: (domain: string) => void;
  onToggleProtectDomain: (domain: string) => void;
  onExportDomain: (group: DomainGroupData) => void;
  onDeleteDomain: (group: DomainGroupData) => void;
  onDelete: (cookie: Cookie) => void;
  onEdit: (cookie: Cookie) => void;
  onToggleProtect: (cookie: Cookie) => void;
}

export function DomainGroup({
  group,
  domainProtected,
  isProtected,
  onTogglePin,
  onToggleProtectDomain,
  onExportDomain,
  onDeleteDomain,
  onDelete,
  onEdit,
  onToggleProtect,
}: DomainGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className={`domain-group${collapsed ? ' domain-group--collapsed' : ''}`}>
      <header className="domain-group__header">
        <button
          type="button"
          className="domain-group__toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className="domain-group__chevron" aria-hidden="true">
            {collapsed ? '▸' : '▾'}
          </span>
          <span className="domain-group__domain">{group.domain}</span>
          <span className="domain-group__count">{group.cookies.length}</span>
          {group.pinned && (
            <span className="domain-group__flag" title="Pinned">
              📌
            </span>
          )}
          {domainProtected && (
            <span className="domain-group__flag" title="Domain protected — bulk deletes skip it">
              🔒
            </span>
          )}
        </button>
        <div className="domain-group__actions">
          <button
            type="button"
            className={`domain-group__action${group.pinned ? ' domain-group__action--active' : ''}`}
            title={group.pinned ? 'Unpin domain' : 'Pin domain to top'}
            onClick={() => onTogglePin(group.domain)}
          >
            📌
          </button>
          <button
            type="button"
            className={`domain-group__action${domainProtected ? ' domain-group__action--active' : ''}`}
            title={domainProtected ? 'Unprotect domain' : 'Protect domain from bulk delete'}
            onClick={() => onToggleProtectDomain(group.domain)}
          >
            🛡
          </button>
          <button
            type="button"
            className="domain-group__action"
            title="Export this domain as JSON"
            onClick={() => onExportDomain(group)}
          >
            ⇩
          </button>
          <button
            type="button"
            className="domain-group__action domain-group__action--danger"
            title="Delete all cookies for this domain"
            onClick={() => onDeleteDomain(group)}
          >
            ×
          </button>
        </div>
      </header>
      {!collapsed && (
        <CookieTable
          cookies={group.cookies}
          isProtected={isProtected}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleProtect={onToggleProtect}
        />
      )}
    </section>
  );
}
