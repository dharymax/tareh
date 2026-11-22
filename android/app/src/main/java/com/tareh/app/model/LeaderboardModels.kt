package com.tareh.app.model

data class LeaderboardEntryDto(
  val rank: Int,
  val user: LeaderboardUserDto,
  val points: Int,
  val exactScorePredictions: Int,
  val firstReachedAt: String?,
)

data class LeaderboardUserDto(
  val id: String,
  val displayName: String,
  val avatarUrl: String?,
)
