export type PredictionScore = {
  homeGoals: number;
  awayGoals: number;
};

export type ScoringRules = {
  exactScorePoints: number;
  correctOutcomePoints: number;
  correctTotalGoalsPoints: number;
};

export type ScoringResultType =
  | 'EXACT_SCORE'
  | 'CORRECT_OUTCOME'
  | 'CORRECT_TOTAL_GOALS'
  | 'INCORRECT';

export type ScoringResult = {
  points: number;
  resultType: ScoringResultType;
};

function outcome(score: PredictionScore): -1 | 0 | 1 {
  if (score.homeGoals > score.awayGoals) return 1;
  if (score.homeGoals < score.awayGoals) return -1;
  return 0;
}

/**
 * Returns one scoring category in priority order.
 * Total goals is used instead of goal difference because a correct goal
 * difference necessarily implies a correct match outcome.
 */
export function calculatePredictionPoints(
  prediction: PredictionScore,
  finalScore: PredictionScore,
  rules: ScoringRules,
): ScoringResult {
  if (
    prediction.homeGoals === finalScore.homeGoals &&
    prediction.awayGoals === finalScore.awayGoals
  ) {
    return { points: rules.exactScorePoints, resultType: 'EXACT_SCORE' };
  }

  if (outcome(prediction) === outcome(finalScore)) {
    return { points: rules.correctOutcomePoints, resultType: 'CORRECT_OUTCOME' };
  }

  const predictedTotal = prediction.homeGoals + prediction.awayGoals;
  const actualTotal = finalScore.homeGoals + finalScore.awayGoals;

  if (predictedTotal === actualTotal) {
    return { points: rules.correctTotalGoalsPoints, resultType: 'CORRECT_TOTAL_GOALS' };
  }

  return { points: 0, resultType: 'INCORRECT' };
}
