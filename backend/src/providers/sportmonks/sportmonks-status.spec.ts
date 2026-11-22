import { describe, expect, it } from 'vitest';
import { MatchStatus } from '../../generated/prisma/client.js';
import { mapSportmonksStatus } from './sportmonks-status.js';

describe('mapSportmonksStatus', () => {
  it('maps scheduled, live and half-time states', () => {
    expect(mapSportmonksStatus('Not Started', 'NOT_STARTED')).toBe(MatchStatus.SCHEDULED);
    expect(mapSportmonksStatus('In Progress', 'INPLAY')).toBe(MatchStatus.LIVE);
    expect(mapSportmonksStatus('Second Half', '2ND_HALF')).toBe(MatchStatus.LIVE);
    expect(mapSportmonksStatus('Extra Time', 'EXTRA_TIME')).toBe(MatchStatus.LIVE);
    expect(mapSportmonksStatus('Half Time', 'HT')).toBe(MatchStatus.HALF_TIME);
  });

  it('maps finished and exceptional states', () => {
    expect(mapSportmonksStatus('Full Time', 'FT')).toBe(MatchStatus.FINISHED);
    expect(mapSportmonksStatus('Postponed', 'POSTPONED')).toBe(MatchStatus.POSTPONED);
    expect(mapSportmonksStatus('Cancelled', 'CANCELLED')).toBe(MatchStatus.CANCELLED);
    expect(mapSportmonksStatus('Abandoned', 'ABANDONED')).toBe(MatchStatus.ABANDONED);
  });

  it('maps interrupted states to paused', () => {
    expect(mapSportmonksStatus('Interrupted', 'INTERRUPTED')).toBe(MatchStatus.PAUSED);
  });
});
