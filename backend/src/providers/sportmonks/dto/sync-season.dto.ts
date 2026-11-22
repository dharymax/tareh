import { IsInt, Min } from 'class-validator';

export class SyncSportmonksSeasonDto {
  @IsInt()
  @Min(1)
  leagueId!: number;

  @IsInt()
  @Min(1)
  seasonId!: number;
}
