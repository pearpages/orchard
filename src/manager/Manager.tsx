import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { CookieEditor, type EditorMode } from '../components/CookieEditor/CookieEditor';
import { DomainGroup } from '../components/DomainGroup/DomainGroup';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ImportDialog } from '../components/ImportExport/ImportDialog';
import { SearchBar } from '../components/SearchBar/SearchBar';
import { useCookieActions } from '../hooks/useCookieActions';
import { useCookies } from '../hooks/useCookies';
import { useProtection } from '../hooks/useProtection';
import { cookieKey, type Cookie } from '../lib/cookies';
import { downloadText } from '../lib/download';
import { filterCookies, groupByDomain, type DomainGroup as DomainGroupData } from '../lib/filter';
import { serializeCookies } from '../lib/importExport';
import { normalizeDomain, partitionForBulkDelete } from '../lib/protection';
import './manager.scss';

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  requireText?: string;
  action: () => void;
}

function exportFileName(scope: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `cookiejar-${scope}-${stamp}.json`;
}

export function Manager() {
  const { cookies, loading } = useCookies();
  const protection = useProtection();
  const actions = useCookieActions();
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingEditKey, setPendingEditKey] = useState<string | null>(() => {
    const match = window.location.hash.match(/^#edit=(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  });

  // Deep link from the popup: #edit=<cookieKey>
  useEffect(() => {
    if (!pendingEditKey || cookies.length === 0) return;
    const cookie = cookies.find((c) => cookieKey(c) === pendingEditKey);
    if (cookie) {
      setEditor({ kind: 'edit', cookie });
      setPendingEditKey(null);
      history.replaceState(null, '', window.location.pathname);
    }
  }, [pendingEditKey, cookies]);

  const sidebarGroups = useMemo(
    () => groupByDomain(cookies, protection.state.pinnedDomains),
    [cookies, protection.state.pinnedDomains],
  );

  const scopedCookies = useMemo(
    () =>
      selectedDomain === null
        ? cookies
        : cookies.filter((c) => normalizeDomain(c.domain) === selectedDomain),
    [cookies, selectedDomain],
  );

  const visibleGroups = useMemo(
    () => groupByDomain(filterCookies(scopedCookies, query), protection.state.pinnedDomains),
    [scopedCookies, query, protection.state.pinnedDomains],
  );

  const visibleCookies = useMemo(
    () => visibleGroups.flatMap((g) => g.cookies),
    [visibleGroups],
  );

  const confirmDeleteDomain = (group: DomainGroupData) => {
    const { deletable, skipped } = partitionForBulkDelete(group.cookies, protection.state);
    setConfirm({
      title: `Delete cookies for ${group.domain}?`,
      body:
        `${deletable.length} cookie${deletable.length === 1 ? '' : 's'} will be deleted.` +
        (skipped.length > 0 ? ` ${skipped.length} protected will be kept.` : '') +
        ' You can undo right after.',
      confirmLabel: 'Delete',
      action: () => {
        void actions.deleteMany(deletable, skipped.length);
        setConfirm(null);
      },
    });
  };

  const confirmDeleteEverything = () => {
    const { deletable, skipped } = partitionForBulkDelete(cookies, protection.state);
    setConfirm({
      title: 'Delete ALL cookies?',
      body:
        `This deletes ${deletable.length} cookie${deletable.length === 1 ? '' : 's'} across every domain in the browser.` +
        (skipped.length > 0 ? ` ${skipped.length} protected will be kept.` : ''),
      confirmLabel: 'Delete everything',
      requireText: 'DELETE',
      action: () => {
        void actions.deleteMany(deletable, skipped.length);
        setConfirm(null);
      },
    });
  };

  const exportView = () => {
    const scope = selectedDomain ?? (query ? 'filtered' : 'all');
    downloadText(exportFileName(scope), serializeCookies(visibleCookies));
  };

  const exportDomain = (group: DomainGroupData) => {
    downloadText(exportFileName(group.domain), serializeCookies(group.cookies));
  };

  return (
    <div className="manager">
      <aside className="manager__sidebar">
        <div className="manager__brand">
          <span className="manager__brand-icon" aria-hidden="true">
            🍪
          </span>
          CookieJar
        </div>
        <nav className="manager__domains">
          <button
            type="button"
            className={`manager__domain-item${selectedDomain === null ? ' manager__domain-item--selected' : ''}`}
            onClick={() => setSelectedDomain(null)}
          >
            <span className="manager__domain-name">All domains</span>
            <span className="manager__domain-count">{cookies.length}</span>
          </button>
          {sidebarGroups.map((group) => (
            <button
              key={group.domain}
              type="button"
              className={`manager__domain-item${selectedDomain === group.domain ? ' manager__domain-item--selected' : ''}`}
              onClick={() => setSelectedDomain(selectedDomain === group.domain ? null : group.domain)}
            >
              <span className="manager__domain-name">
                {group.pinned && (
                  <span className="manager__domain-pin" aria-hidden="true">
                    📌
                  </span>
                )}
                {group.domain}
              </span>
              <span className="manager__domain-count">{group.cookies.length}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="manager__main">
        <div className="manager__toolbar">
          <div className="manager__search">
            <SearchBar value={query} onChange={setQuery} slashShortcut placeholder='Search all cookies…  ("/" to focus, domain:foo name:bar)' />
          </div>
          <div className="manager__toolbar-actions">
            <button
              type="button"
              className="manager__button manager__button--primary"
              onClick={() => setEditor({ kind: 'create', domain: selectedDomain ?? undefined })}
            >
              + New cookie
            </button>
            <button type="button" className="manager__button" onClick={() => setImportOpen(true)}>
              Import
            </button>
            <button
              type="button"
              className="manager__button"
              disabled={visibleCookies.length === 0}
              onClick={exportView}
              title="Export the cookies currently shown as JSON"
            >
              Export view
            </button>
            <button
              type="button"
              className="manager__button manager__button--danger"
              disabled={cookies.length === 0}
              onClick={confirmDeleteEverything}
            >
              Delete all…
            </button>
          </div>
        </div>

        <div className="manager__content">
          {loading ? (
            <p className="manager__loading">Loading cookies…</p>
          ) : cookies.length === 0 ? (
            <EmptyState
              title="The jar is empty"
              hint="No cookies in this browser profile yet. Visit some sites, or import a JSON export."
              action={{ label: 'Import cookies', onClick: () => setImportOpen(true) }}
            />
          ) : visibleGroups.length === 0 ? (
            <EmptyState
              title={`No matches for "${query}"`}
              hint="Tip: use domain:example or name:session to narrow the search."
            />
          ) : (
            visibleGroups.map((group) => (
              <DomainGroup
                key={group.domain}
                group={group}
                domainProtected={protection.isDomainProtected(group.domain)}
                isProtected={protection.isProtected}
                onTogglePin={protection.togglePin}
                onToggleProtectDomain={protection.toggleDomain}
                onExportDomain={exportDomain}
                onDeleteDomain={confirmDeleteDomain}
                onDelete={(c: Cookie) => void actions.deleteOne(c)}
                onEdit={(c: Cookie) => setEditor({ kind: 'edit', cookie: c })}
                onToggleProtect={protection.toggleCookie}
              />
            ))
          )}
        </div>
      </main>

      {editor && <CookieEditor mode={editor} onClose={() => setEditor(null)} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          requireText={confirm.requireText}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
