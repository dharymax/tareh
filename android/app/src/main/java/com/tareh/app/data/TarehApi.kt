package com.tareh.app.data

import com.tareh.app.model.ApiEnvelope
import com.tareh.app.model.MatchDto
import retrofit2.http.GET

interface TarehApi {
  @GET("matches/today")
  suspend fun getTodayMatches(): ApiEnvelope<List<MatchDto>>

  @GET("matches/live")
  suspend fun getLiveMatches(): ApiEnvelope<List<MatchDto>>
}
