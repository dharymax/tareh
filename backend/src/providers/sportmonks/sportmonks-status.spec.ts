import { describe, expect, it } from 'vitest';
import { MatchStatus } from '../../generated/prisma/client.js';
import { mapSportmonksStatus } from './sportmonks-status.js';

describe('mapSportmonksStatus', () => {
  it('maps scheduled and in-play state codes', () => {
    expect(mapSportmonksStatus('NS', 'Not Started')).toBe(MatchStatus.SCHEDULED);
    expect(mapSportmonksStatus('INPLAY_1ST_HALF', 'In play, first half')).toBe(MatchStatus.LIVE);
    expect(mapSportmonksStatus('INPLAY_2ND_HALF', 'In play, second half')).toBe(MatchStatus.LIVE);
    expect(mapSportmonksStatus('INPLAY_ET', 'Extra time')).toBe(MatchStatus.LIVE);
    expect(mapSportmonksStatus('INPLAY_PENALTIES', 'Penalty shootout')).toBe(MatchStatus.LIVE);
  });

  it('maps half-time and break states', () => {
    expect(mapSportmonksStatus('HT', 'Half-Time')).toBe(MatchStatus.HALF_TIME);
    expect(mapSportmonksStatus('BREAK', 'Regular Time Finished')).toBe(MatchStatus.PAUSED);
    expect(mapSportmonksStatus('EXTRA_TIME_BREAK', 'Extra Time Break')).toBe(MatchStatus.PAUSED);
  });

  it('maps all completed states to finished', () => {
    expect(mapSportmonksStatus('FT', 'Full-Time')).toBe(MatchStatus.FINISHED);
    expect(mapSportmonksStatus('AET', 'Finished After Extra Time')).toBe(MatchStatus.FINISHED);
    expect(mapSportmonksStatus('FT_PEN', 'Full-Time After Penalties')).toBe(MatchStatus.FINISHED);
  });

  it('preserves postponed, cancelled, abandoned and interrupted states', () => {
    expect(mapSportmonksStatus('POSTPONED', 'Postponed')).toBe(MatchStatus.POSTPONED);
    expect(mapSportmonksStatus('CANCL', 'Cancelled')).toBe(MatchStatus.CANCELLED);
    expect(mapSportmonksStatus('ABAN', 'Abandoned')).toBe(MatchStatus.ABANDONED);
    expect(mapSportmonksStatus('INTERRUPTED', 'Interrupted')).toBe(MatchStatus.PAUSED);
    expect(mapSportmonksStatus('SUSPENDED', 'Suspended')).toBe(MatchStatus.PAUSED);
  });
});
