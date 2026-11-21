package com.tareh.app.model

data class ApiEnvelope<T>(
  val data: T,
)

data class MatchDto(
  val id: String,
  val kickoffAt: String,
  val status: String,
  val homeScore: Int?,
  val awayScore: Int?,
  val league: LeagueDto,
  val homeTeam: TeamDto,
  val awayTeam: TeamDto,
)

data class LeagueDto(
  val id: String,
  val name: String,
  val logoUrl: String?,
)

data class TeamDto(
  val id: String,
  val name: String,
  val shortName: String?,
  val logoUrl: String?,
)
