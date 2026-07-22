import type { Cookie } from '../../lib/cookies';
import { cookieKey } from '../../lib/cookies';
import { CookieRow } from '../CookieRow/CookieRow';
import './cookie-table.scss';

interface CookieTableProps {
  cookies: Cookie[];
  compact?: boolean;
  showDomain?: boolean;
  isProtected: (cookie: Cookie) => boolean;
  onDelete: (cookie: Cookie) => void;
  onEdit: (cookie: Cookie) => void;
  onToggleProtect: (cookie: Cookie) => void;
}

export function CookieTable({
  cookies,
  compact,
  showDomain,
  isProtected,
  onDelete,
  onEdit,
  onToggleProtect,
}: CookieTableProps) {
  return (
    <ul className={`cookie-table${compact ? ' cookie-table--compact' : ''}`}>
      {cookies.map((cookie) => (
        <CookieRow
          key={cookieKey(cookie)}
          cookie={cookie}
          isProtected={isProtected(cookie)}
          showDomain={showDomain}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleProtect={onToggleProtect}
        />
      ))}
    </ul>
  );
}
