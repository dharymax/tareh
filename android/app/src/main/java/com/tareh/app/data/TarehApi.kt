package com.tareh.app.data

import com.tareh.app.model.ApiEnvelope
import com.tareh.app.model.AuthResponse
import com.tareh.app.model.RefreshTokenRequest
import com.tareh.app.model.RefreshTokenResponse
import com.tareh.app.model.SendOtpRequest
import com.tareh.app.model.SendOtpResponse
import com.tareh.app.model.UserMeDto
import com.tareh.app.model.CreatePredictionRequest
import com.tareh.app.model.PredictionDto
import com.tareh.app.model.MatchDto
import com.tareh.app.model.LeaderboardEntryDto
import retrofit2.http.Query
import com.tareh.app.model.VerifyOtpRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface TarehApi {
  @POST("auth/send-otp")
  suspend fun sendOtp(@Body body: SendOtpRequest): SendOtpResponse

  @POST("auth/verify-otp")
  suspend fun verifyOtp(@Body body: VerifyOtpRequest): AuthResponse

  @POST("auth/refresh")
  suspend fun refreshSession(@Body body: RefreshTokenRequest): RefreshTokenResponse

  @GET("auth/me")
  suspend fun getMe(@Header("Authorization") authorization: String): UserMeDto

  @POST("predictions")
  suspend fun savePrediction(
    @Header("Authorization") authorization: String,
    @Body body: CreatePredictionRequest,
  ): ApiEnvelope<PredictionDto>

  @GET("matches/today")
  suspend fun getTodayMatches(): ApiEnvelope<List<MatchDto>>

  @GET("matches/live")
  suspend fun getLiveMatches(): ApiEnvelope<List<MatchDto>>

  @GET("leaderboard/global")
  suspend fun getLeaderboard(
    @Query("period") period: String = "all",
    @Query("limit") limit: Int = 50,
  ): ApiEnvelope<List<LeaderboardEntryDto>>
}
