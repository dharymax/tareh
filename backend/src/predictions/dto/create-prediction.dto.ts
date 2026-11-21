import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreatePredictionDto {
  @IsUUID('4')
  matchId!: string;

  @IsInt()
  @Min(0)
  @Max(30)
  homeGoals!: number;

  @IsInt()
  @Min(0)
  @Max(30)
  awayGoals!: number;
}
