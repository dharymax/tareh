import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export const MATCH_STATUSES = [
  'SCHEDULED',
  'LIVE',
  'HALF_TIME',
  'PAUSED',
  'FINISHED',
  'POSTPONED',
  'CANCELLED',
  'ABANDONED',
] as const;

export class MatchesQueryDto {
  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @IsOptional()
  @IsIn(MATCH_STATUSES)
  status?: (typeof MATCH_STATUSES)[number];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class TeamsQueryDto {
  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class UpcomingMatchesQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsUUID()
  leagueId?: string;
}
