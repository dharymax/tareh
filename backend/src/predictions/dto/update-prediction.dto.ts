import { IsInt, Max, Min } from 'class-validator';

export class UpdatePredictionDto {
  @IsInt()
  @Min(0)
  @Max(30)
  homeGoals!: number;

  @IsInt()
  @Min(0)
  @Max(30)
  awayGoals!: number;
}
