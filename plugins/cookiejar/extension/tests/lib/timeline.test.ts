import { describe, expect, it } from 'vitest';
import {
  TIMELINE_CAP,
  appendEvents,
  eventFromChange,
  filterEvents,
  loadPaused,
  loadTimeline,
  saveTimeline,
  setPaused,
  type TimelineEvent,
} from '../../src/lib/timeline';
import { makeCookie } from '../chromeMock';

function event(partial: Partial<TimelineEvent['cookie']>, removed = false): TimelineEvent {
  return eventFromChange(
    { cookie: makeCookie(partial), removed, cause: 'explicit' },
    new Date('2026-07-21T10:00:00Z'),
  );
}

describe('appendEvents', () => {
  it('prepends newest first and honors the cap', () => {
    const existing = [event({ name: 'old' })];
    const merged = appendEvents(existing, [event({ name: 'new' })], 2);
    expect(merged.map((e) => e.cookie.name)).toEqual(['new', 'old']);
    const capped = appendEvents(merged, [event({ name: 'newest' })], 2);
    expect(capped.map((e) => e.cookie.name)).toEqual(['newest', 'new']);
  });

  it('defaults to TIMELINE_CAP', () => {
    const many = Array.from({ length: TIMELINE_CAP + 10 }, (_, i) => event({ name: `c${i}` }));
    expect(appendEvents([], many)).toHaveLength(TIMELINE_CAP);
  });
});

describe('eventFromChange', () => {
  it('captures the change and truncates huge values', () => {
    const huge = 'x'.repeat(3000);
    const e = eventFromChange({ cookie: makeCookie({ value: huge }), removed: false, cause: 'explicit' });
    expect(e.cookie.value).toHaveLength(2000);
    expect(e.cookie.valueTruncated).toBe(true);
    const small = eventFromChange({ cookie: makeCookie({}), removed: true, cause: 'expired' });
    expect(small.removed).toBe(true);
    expect(small.cause).toBe('expired');
    expect(small.cookie.valueTruncated).toBeUndefined();
  });
});

describe('filterEvents', () => {
  const events = [
    event({ name: 'session', domain: '.example.com', value: 'abc' }),
    event({ name: 'ga_id', domain: 'analytics.io', value: 'example-ref' }),
  ];

  it('supports domain: and name: prefixes and free text', () => {
    expect(filterEvents(events, 'domain:example')).toHaveLength(1);
    expect(filterEvents(events, 'name:ga')).toHaveLength(1);
    expect(filterEvents(events, 'abc')).toHaveLength(1);
    expect(filterEvents(events, '')).toHaveLength(2);
  });
});

describe('persistence', () => {
  it('round-trips events and the pause flag through storage.session', async () => {
    expect(await loadTimeline()).toEqual([]);
    const events = [event({ name: 'sid' })];
    await saveTimeline(events);
    expect(await loadTimeline()).toEqual(events);

    expect(await loadPaused()).toBe(false);
    await setPaused(true);
    expect(await loadPaused()).toBe(true);
  });
});
