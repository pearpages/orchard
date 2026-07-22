import { useEffect, useState } from 'react';
import { bareDomain, listAll } from '../../lib/cookies';
import { truncate } from '../../lib/format';
import {
  buildSnapshot,
  diffSnapshots,
  type Snapshot,
  type SnapshotDiff as Diff,
  type SnapshotEntry,
} from '../../lib/snapshot';
import { EmptyState } from '../EmptyState/EmptyState';
import './timeline.scss';

interface SnapshotDiffProps {
  snapshot: Snapshot;
  onBack: () => void;
}

function EntryLine({ entry }: { entry: SnapshotEntry }) {
  return (
    <span className="timeline__cookie">
      <code className="timeline__domain">{bareDomain(entry.domain)}</code>
      <code className="timeline__name">{entry.name}</code>
    </span>
  );
}

export function SnapshotDiff({ snapshot, onBack }: SnapshotDiffProps) {
  const [diff, setDiff] = useState<Diff | null>(null);

  useEffect(() => {
    void listAll().then((cookies) => setDiff(diffSnapshots(snapshot, buildSnapshot(cookies))));
  }, [snapshot]);

  const total = diff ? diff.added.length + diff.removed.length + diff.changed.length : 0;

  return (
    <div className="timeline">
      <div className="timeline__toolbar">
        <button type="button" className="timeline__button" onClick={onBack}>
          ← Back to timeline
        </button>
        <span className="timeline__diff-title">
          Changes since {new Date(snapshot.ts).toLocaleTimeString()}
        </span>
      </div>
      <div className="timeline__content">
        {!diff ? null : total === 0 ? (
          <EmptyState title="No cookie changes since the snapshot" />
        ) : (
          <>
            {diff.added.length > 0 && (
              <section className="timeline__diff-section">
                <h3 className="timeline__diff-heading">Added ({diff.added.length})</h3>
                <ul className="timeline__list">
                  {diff.added.map((entry, i) => (
                    <li key={i} className="timeline__event timeline__event--set">
                      <EntryLine entry={entry} />
                      <code className="timeline__value" title={entry.value}>
                        {truncate(entry.value, 60)}
                      </code>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {diff.removed.length > 0 && (
              <section className="timeline__diff-section">
                <h3 className="timeline__diff-heading">Removed ({diff.removed.length})</h3>
                <ul className="timeline__list">
                  {diff.removed.map((entry, i) => (
                    <li key={i} className="timeline__event timeline__event--removed">
                      <EntryLine entry={entry} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {diff.changed.length > 0 && (
              <section className="timeline__diff-section">
                <h3 className="timeline__diff-heading">Changed ({diff.changed.length})</h3>
                <ul className="timeline__list">
                  {diff.changed.map((change) => (
                    <li key={change.key} className="timeline__event timeline__event--changed">
                      <EntryLine entry={change.after} />
                      <span className="timeline__change">
                        <code title={change.before.value}>{truncate(change.before.value, 24)}</code>
                        <span aria-hidden="true"> → </span>
                        <code title={change.after.value}>{truncate(change.after.value, 24)}</code>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
