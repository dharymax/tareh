import { Matches } from 'class-validator';

export class SyncSeasonDto {
  @Matches(/^sr:competition:\d+$/, {
    message: 'competitionId must be a Sportradar competition URN',
  })
  competitionId!: string;

  @Matches(/^sr:season:\d+$/, {
    message: 'seasonId must be a Sportradar season URN',
  })
  seasonId!: string;
}
