import { useCallback } from 'react';
import {
  draftFromCookie,
  removeCookie,
  removeCookies,
  setFromCookie,
  type Cookie,
} from '../lib/cookies';
import { useToast } from './useToast';

/** Restore deleted cookies (undo). Best effort — session state can't be perfect. */
function restore(cookies: Cookie[]) {
  for (const cookie of cookies) {
    void setFromCookie(draftFromCookie(cookie)).catch(() => undefined);
  }
}

/** Delete actions with undo toasts, shared by popup and manager. */
export function useCookieActions() {
  const toast = useToast();

  const deleteOne = useCallback(
    async (cookie: Cookie) => {
      try {
        await removeCookie(cookie);
        toast.undoable(`Deleted "${cookie.name}"`, () => restore([cookie]));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    },
    [toast],
  );

  const deleteMany = useCallback(
    async (cookies: Cookie[], skippedCount = 0) => {
      const { deleted, failed } = await removeCookies(cookies);
      const parts = [`Deleted ${deleted.length} cookie${deleted.length === 1 ? '' : 's'}`];
      if (skippedCount > 0) parts.push(`${skippedCount} protected kept`);
      if (failed.length > 0) parts.push(`${failed.length} failed`);
      const message = parts.join(' — ');
      if (deleted.length > 0) toast.undoable(message, () => restore(deleted));
      else toast.error(message);
    },
    [toast],
  );

  return { deleteOne, deleteMany };
}
