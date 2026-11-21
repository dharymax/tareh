import { MatchStatus } from '../../generated/prisma/client.js';

export function mapSportradarStatus(
  status: string | null,
  matchStatus: string | null,
): MatchStatus {
  const overall = (status ?? '').trim().toLowerCase();
  const detail = (matchStatus ?? '').trim().toLowerCase();
  const combined = `${overall} ${detail}`;

  if (combined.includes('postponed') || combined.includes('rescheduled')) {
    return MatchStatus.POSTPONED;
  }
  if (combined.includes('cancelled') || combined.includes('canceled')) {
    return MatchStatus.CANCELLED;
  }
  if (combined.includes('abandoned')) {
    return MatchStatus.ABANDONED;
  }
  if (
    ['ended', 'closed', 'finished'].includes(overall) ||
    ['ended', 'closed', 'finished'].includes(detail)
  ) {
    return MatchStatus.FINISHED;
  }
  if (
    detail.includes('half_time') ||
    detail.includes('halftime') ||
    detail.includes('half-time') ||
    detail === 'break'
  ) {
    return MatchStatus.HALF_TIME;
  }
  if (
    combined.includes('suspended') ||
    combined.includes('interrupted') ||
    combined.includes('delayed') ||
    combined.includes('paused')
  ) {
    return MatchStatus.PAUSED;
  }
  if (
    overall === 'live' ||
    detail.includes('1st_half') ||
    detail.includes('2nd_half') ||
    detail.includes('extra_time') ||
    detail.includes('penalt')
  ) {
    return MatchStatus.LIVE;
  }

  return MatchStatus.SCHEDULED;
}
