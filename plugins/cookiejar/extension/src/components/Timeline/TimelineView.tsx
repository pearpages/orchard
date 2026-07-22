import { useState } from 'react';
import { useTimeline } from '../../hooks/useTimeline';
import { useToast } from '../../hooks/useToast';
import { bareDomain } from '../../lib/cookies';
import { truncate } from '../../lib/format';
import { filterEvents } from '../../lib/timeline';
import { loadSnapshot, takeSnapshot, type Snapshot } from '../../lib/snapshot';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { EmptyState } from '../EmptyState/EmptyState';
import { SearchBar } from '../SearchBar/SearchBar';
import { SnapshotDiff } from './SnapshotDiff';
import './timeline.scss';
import { useEffect } from 'react';

const CAUSE_LABELS: Record<string, string> = {
  explicit: 'set',
  overwrite: 'overwrite',
  expired: 'expired',
  evicted: 'evicted',
  expired_overwrite: 'expired',
};

export function TimelineView() {
  const { events, paused, togglePause, clear } = useTimeline();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [diffing, setDiffing] = useState(false);

  useEffect(() => {
    void loadSnapshot().then(setSnapshot);
  }, []);

  const visible = filterEvents(events, query);

  const onTakeSnapshot = async () => {
    const snap = await takeSnapshot();
    setSnapshot(snap);
    setDiffing(false);
    toast.success(`Snapshot taken (${Object.keys(snap.entries).length} cookies)`);
  };

  if (diffing && snapshot) {
    return <SnapshotDiff snapshot={snapshot} onBack={() => setDiffing(false)} />;
  }

  return (
    <div className="timeline">
      <div className="timeline__toolbar">
        <div className="timeline__search">
          <SearchBar value={query} onChange={setQuery} placeholder="Filter events… (domain:foo name:bar)" />
        </div>
        <button
          type="button"
          className={`timeline__pause${paused ? '' : ' timeline__pause--recording'}`}
          onClick={togglePause}
        >
          <span className="timeline__dot" aria-hidden="true" />
          {paused ? 'Resume' : 'Recording'}
        </button>
        <button type="button" className="timeline__button" onClick={() => void onTakeSnapshot()}>
          Take snapshot
        </button>
        <button
          type="button"
          className="timeline__button"
          disabled={!snapshot}
          onClick={() => setDiffing(true)}
          title={snapshot ? undefined : 'Take a snapshot first'}
        >
          {snapshot ? `Diff vs ${new Date(snapshot.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Diff…'}
        </button>
        <button
          type="button"
          className="timeline__button timeline__button--danger"
          disabled={events.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          Clear log
        </button>
      </div>
      <div className="timeline__content">
        {events.length === 0 ? (
          <EmptyState
            title="No cookie changes recorded yet"
            hint="Browse around — every cookie set or removed in the browser lands here. Run your login flow and watch what it does."
          />
        ) : visible.length === 0 ? (
          <EmptyState title={`No events match "${query}"`} />
        ) : (
          <ul className="timeline__list">
            {visible.map((event, index) => (
              <li
                key={`${event.ts}-${index}`}
                className={`timeline__event ${event.removed ? 'timeline__event--removed' : 'timeline__event--set'}`}
              >
                <span className="timeline__time">
                  {new Date(event.ts).toLocaleTimeString()}
                </span>
                <span className={`timeline__cause timeline__cause--${event.cause}`}>
                  {event.removed ? (CAUSE_LABELS[event.cause] === 'set' ? 'removed' : CAUSE_LABELS[event.cause]) : CAUSE_LABELS[event.cause]}
                </span>
                <span className="timeline__cookie">
                  <code className="timeline__domain">{bareDomain(event.cookie.domain)}</code>
                  <code className="timeline__name">{event.cookie.name}</code>
                </span>
                {!event.removed && (
                  <code className="timeline__value" title={event.cookie.value}>
                    {truncate(event.cookie.value, 60)}
                    {event.cookie.valueTruncated ? '…' : ''}
                  </code>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="timeline__footnote">
        Recorded values live in session memory only and are gone when the browser closes.
      </p>
      {confirmClear && (
        <ConfirmDialog
          title="Clear the timeline?"
          body={`${events.length} recorded event${events.length === 1 ? '' : 's'} will be discarded.`}
          confirmLabel="Clear"
          onConfirm={() => {
            clear();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
