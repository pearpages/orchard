import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { CookieTable } from '../components/CookieTable/CookieTable';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { SearchBar } from '../components/SearchBar/SearchBar';
import { useCookieActions } from '../hooks/useCookieActions';
import { useCookies } from '../hooks/useCookies';
import { useProtection } from '../hooks/useProtection';
import { cookieKey, cookiesForHost, type Cookie } from '../lib/cookies';
import { filterCookies } from '../lib/filter';
import { partitionForBulkDelete } from '../lib/protection';
import { PopupStorage } from './PopupStorage';
import './popup.scss';

const MANAGER_PATH = 'src/manager/index.html';

function openManager(hash = '') {
  void chrome.tabs.create({ url: chrome.runtime.getURL(MANAGER_PATH) + hash });
  window.close();
}

export function Popup() {
  const { cookies, loading } = useCookies();
  const protection = useProtection();
  const actions = useCookieActions();
  const [host, setHost] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [tab, setTab] = useState<'cookies' | 'storage'>('cookies');

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      try {
        setHost(tab?.url ? new URL(tab.url).hostname : null);
      } catch {
        setHost(null);
      }
    });
  }, []);

  const siteCookies = useMemo(
    () => (host ? cookiesForHost(cookies, host) : []),
    [cookies, host],
  );
  const visible = useMemo(() => filterCookies(siteCookies, query), [siteCookies, query]);

  const editInManager = (cookie: Cookie) => {
    openManager(`#edit=${encodeURIComponent(cookieKey(cookie))}`);
  };

  const deleteAllForSite = () => {
    const { deletable, skipped } = partitionForBulkDelete(siteCookies, protection.state);
    void actions.deleteMany(deletable, skipped.length);
    setConfirmingDeleteAll(false);
  };

  return (
    <div className="popup">
      <header className="popup__header">
        <div className="popup__site">
          <span className="popup__host" title={host ?? undefined}>
            {host ?? 'This page'}
          </span>
          <span className="popup__count">
            {siteCookies.length} cookie{siteCookies.length === 1 ? '' : 's'}
          </span>
        </div>
        <button type="button" className="popup__open-manager" onClick={() => openManager()}>
          Open Manager ↗
        </button>
      </header>

      <div className="popup__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cookies'}
          className={`popup__tab${tab === 'cookies' ? ' popup__tab--active' : ''}`}
          onClick={() => setTab('cookies')}
        >
          Cookies
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'storage'}
          className={`popup__tab${tab === 'storage' ? ' popup__tab--active' : ''}`}
          onClick={() => setTab('storage')}
        >
          Storage
        </button>
      </div>

      {tab === 'storage' ? (
        <main className="popup__body">
          <PopupStorage />
        </main>
      ) : (
        <>
      <div className="popup__search">
        <SearchBar value={query} onChange={setQuery} autoFocus placeholder="Search this site's cookies…" />
      </div>

      <main className="popup__body">
        {loading ? (
          <p className="popup__loading">Loading cookies…</p>
        ) : siteCookies.length === 0 ? (
          <EmptyState
            title="No cookies for this site"
            hint="This page hasn't set any cookies yet."
            action={{ label: 'Browse all domains', onClick: () => openManager() }}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={`No matches for "${query}"`}
            hint="Try the Manager to search across every domain."
            action={{ label: 'Search all domains', onClick: () => openManager() }}
          />
        ) : (
          <CookieTable
            cookies={visible}
            compact
            showDomain
            isProtected={protection.isProtected}
            onDelete={(c) => void actions.deleteOne(c)}
            onEdit={editInManager}
            onToggleProtect={protection.toggleCookie}
          />
        )}
      </main>

      {siteCookies.length > 0 && (
        <footer className="popup__footer">
          <button
            type="button"
            className="popup__delete-all"
            onClick={() => setConfirmingDeleteAll(true)}
          >
            Delete all for this site ({siteCookies.length})
          </button>
        </footer>
      )}
        </>
      )}

      {confirmingDeleteAll && (
        <ConfirmDialog
          title="Delete this site's cookies?"
          body={buildDeleteBody(
            siteCookies,
            partitionForBulkDelete(siteCookies, protection.state).skipped.length,
            host ?? 'this site',
          )}
          confirmLabel="Delete"
          onConfirm={deleteAllForSite}
          onCancel={() => setConfirmingDeleteAll(false)}
        />
      )}
    </div>
  );
}

function buildDeleteBody(cookies: Cookie[], skipped: number, host: string): string {
  const deletable = cookies.length - skipped;
  let body = `${deletable} cookie${deletable === 1 ? '' : 's'} for ${host} will be deleted.`;
  if (skipped > 0) body += ` ${skipped} protected cookie${skipped === 1 ? '' : 's'} will be kept.`;
  return `${body} You can undo right after.`;
}
