package com.tareh.app.model

data class CreatePredictionRequest(
  val matchId: String,
  val homeGoals: Int,
  val awayGoals: Int,
)

data class PredictionDto(
  val id: String,
  val matchId: String,
  val homeGoals: Int,
  val awayGoals: Int,
  val submittedAt: String,
  val updatedAt: String,
)
