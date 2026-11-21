package com.tareh.app.model

data class SendOtpRequest(
  val phone: String,
)

data class SendOtpResponse(
  val message: String,
  val expiresIn: Int,
)

data class VerifyOtpRequest(
  val phone: String,
  val code: String,
)

data class AuthUserDto(
  val id: String,
  val displayName: String,
  val status: String,
)

data class AuthResponse(
  val accessToken: String,
  val refreshToken: String,
  val tokenType: String,
  val expiresIn: Int,
  val user: AuthUserDto,
)

data class RefreshTokenRequest(
  val refreshToken: String,
)

data class RefreshTokenResponse(
  val accessToken: String,
  val refreshToken: String,
  val tokenType: String,
  val expiresIn: Int,
)
