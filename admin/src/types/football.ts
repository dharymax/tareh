export type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HALF_TIME'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'ABANDONED';

export interface TeamSummary {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

export interface LeagueSummary {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface MatchSummary {
  id: string;
  kickoffAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  league: LeagueSummary;
}

export interface MatchesResponse {
  data: MatchSummary[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
    lastUpdatedAt: string | null;
    timezone: 'Asia/Aden';
  };
}

export interface LeaguesResponse {
  data: LeagueSummary[];
  meta: {
    count: number;
    generatedAt: string;
  };
}

export interface TodayMatchesResponse {
  data: MatchSummary[];
  meta: {
    count: number;
    date: string;
    timezone: 'Asia/Aden';
  };
}
