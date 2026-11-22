import { MatchStatus } from '../../generated/prisma/client.js';

export function mapSportmonksStatus(
  stateName: string | null,
  developerName: string | null,
): MatchStatus {
  const state = `${stateName ?? ''} ${developerName ?? ''}`.trim().toLowerCase();

  if (state.includes('postpon')) return MatchStatus.POSTPONED;
  if (state.includes('cancel')) return MatchStatus.CANCELLED;
  if (state.includes('abandon')) return MatchStatus.ABANDONED;
  if (
    state === 'ft' ||
    state.includes('full time') ||
    state.includes('finished') ||
    state.includes('after extra time') ||
    state.includes('after penalties')
  ) return MatchStatus.FINISHED;
  if (state.includes('half time') || state === 'ht' || state.includes('halftime')) {
    return MatchStatus.HALF_TIME;
  }
  if (
    state.includes('suspend') ||
    state.includes('interrupt') ||
    state.includes('delay') ||
    state.includes('paused')
  ) return MatchStatus.PAUSED;
  if (
    state.includes('inplay') ||
    state.includes('in play') ||
    state.includes('live') ||
    state.includes('1st half') ||
    state.includes('2nd half') ||
    state.includes('extra time') ||
    state.includes('penalt')
  ) return MatchStatus.LIVE;

  return MatchStatus.SCHEDULED;
}
