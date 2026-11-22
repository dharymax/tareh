import { MatchStatus } from '../../generated/prisma/client.js';

export function mapSportmonksStatus(
  stateCodeOrName: string | null,
  developerName: string | null,
): MatchStatus {
  const code = (stateCodeOrName ?? '')
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, '_');
  const description = (developerName ?? '').trim().toLowerCase();
  const combined = `${code} ${description}`;

  if (
    ['POSTP', 'POSTPONED'].includes(code) ||
    combined.includes('postpon')
  ) return MatchStatus.POSTPONED;
  if (
    ['CANCL', 'CANCELLED', 'CANCELED'].includes(code) ||
    combined.includes('cancel')
  ) return MatchStatus.CANCELLED;
  if (
    ['ABAN', 'ABANDONED'].includes(code) ||
    combined.includes('abandon')
  ) return MatchStatus.ABANDONED;
  if (
    ['FT', 'AET', 'FT_PEN', 'FULL_TIME', 'FINISHED'].includes(code) ||
    (code !== 'BREAK' &&
      (combined.includes('full time') ||
        combined.includes('finished after') ||
        combined.includes('finished')))
  ) return MatchStatus.FINISHED;

  if (
    ['HT', 'HALF_TIME', 'HALFTIME'].includes(code) ||
    combined.includes('half-time') ||
    combined.includes('half time') ||
    combined.includes('halftime')
  ) return MatchStatus.HALF_TIME;

  if (
    [
      'SUSPENDED',
      'SUSP',
      'DELAYED',
      'INTERRUPTED',
      'INT',
      'BREAK',
      'EXTRA_TIME_BREAK',
      'PEN_BREAK',
      'PAUSED',
    ].includes(code) ||
    combined.includes('suspend') ||
    combined.includes('interrupt') ||
    combined.includes('delay') ||
    combined.includes('paused')
  ) return MatchStatus.PAUSED;

  if (
    code.startsWith('INPLAY') ||
    ['LIVE', 'ET', 'PEN_LIVE', '1ST_HALF', '2ND_HALF'].includes(code) ||
    combined.includes('in play') ||
    combined.includes('1st half') ||
    combined.includes('2nd half') ||
    combined.includes('extra time') ||
    combined.includes('penalty shootout')
  ) return MatchStatus.LIVE;

  return MatchStatus.SCHEDULED;
}
