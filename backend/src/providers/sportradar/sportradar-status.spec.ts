import { describe, expect, it } from 'vitest';
import { MatchStatus } from '../../generated/prisma/client.js';
import { mapSportradarStatus } from './sportradar-status.js';

describe('mapSportradarStatus', () => {
  it('maps an unstarted event to scheduled', () => {
    expect(mapSportradarStatus('not_started', 'not_started')).toBe(
      MatchStatus.SCHEDULED,
    );
  });

  it('maps first and second half events to live', () => {
    expect(mapSportradarStatus('live', '1st_half')).toBe(MatchStatus.LIVE);
    expect(mapSportradarStatus('live', '2nd_half')).toBe(MatchStatus.LIVE);
  });

  it('maps half time to the dedicated status', () => {
    expect(mapSportradarStatus('live', 'halftime')).toBe(
      MatchStatus.HALF_TIME,
    );
  });

  it('maps ended events to finished without confirming the result', () => {
    expect(mapSportradarStatus('ended', 'ended')).toBe(MatchStatus.FINISHED);
  });

  it('preserves postponed, cancelled and abandoned statuses', () => {
    expect(mapSportradarStatus('postponed', 'postponed')).toBe(
      MatchStatus.POSTPONED,
    );
    expect(mapSportradarStatus('cancelled', 'cancelled')).toBe(
      MatchStatus.CANCELLED,
    );
    expect(mapSportradarStatus('abandoned', 'abandoned')).toBe(
      MatchStatus.ABANDONED,
    );
  });

  it('maps interrupted matches to paused', () => {
    expect(mapSportradarStatus('live', 'interrupted')).toBe(
      MatchStatus.PAUSED,
    );
  });
});
