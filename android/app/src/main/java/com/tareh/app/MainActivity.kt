package com.tareh.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.tareh.app.data.StoredTokens
import com.tareh.app.data.TarehApi
import com.tareh.app.data.TarehNetwork
import com.tareh.app.data.TokenStore
import com.tareh.app.model.CreatePredictionRequest
import com.tareh.app.model.MatchDto
import com.tareh.app.model.LeaderboardEntryDto
import com.tareh.app.model.RefreshTokenRequest
import com.tareh.app.model.SendOtpRequest
import com.tareh.app.model.VerifyOtpRequest
import com.tareh.app.ui.HomeScreen
import com.tareh.app.ui.LoginScreen
import com.tareh.app.ui.TarehTheme
import kotlinx.coroutines.launch
import retrofit2.HttpException

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    val api = TarehNetwork.create().create(TarehApi::class.java)
    val tokenStore = TokenStore(applicationContext)

    setContent {
      TarehTheme {
        val scope = rememberCoroutineScope()
        var tokens by remember { mutableStateOf(tokenStore.read()) }
        var sentPhone by remember { mutableStateOf<String?>(null) }
        var authBusy by remember { mutableStateOf(false) }
        var authError by remember { mutableStateOf<String?>(null) }
        var matches by remember { mutableStateOf<List<MatchDto>>(emptyList()) }
        var loading by remember { mutableStateOf(true) }
        var matchError by remember { mutableStateOf<String?>(null) }
        var predictionMessage by remember { mutableStateOf<String?>(null) }
        var leaderboard by remember { mutableStateOf<List<LeaderboardEntryDto>>(emptyList()) }
        var leaderboardLoading by remember { mutableStateOf(true) }
        var leaderboardError by remember { mutableStateOf<String?>(null) }

        if (tokens == null) {
          LoginScreen(
            busy = authBusy,
            sentPhone = sentPhone,
            error = authError,
            onSendOtp = { phone ->
              scope.launch {
                authBusy = true
                authError = null
                try {
                  api.sendOtp(SendOtpRequest(phone))
                  sentPhone = phone
                } catch (exception: Exception) {
                  authError = exception.userMessage()
                } finally {
                  authBusy = false
                }
              }
            },
            onVerifyOtp = { phone, code ->
              scope.launch {
                authBusy = true
                authError = null
                try {
                  val response = api.verifyOtp(VerifyOtpRequest(phone, code))
                  val newTokens = StoredTokens(
                    accessToken = response.accessToken,
                    refreshToken = response.refreshToken,
                  )
                  tokenStore.save(newTokens)
                  tokens = newTokens
                  sentPhone = null
                  authError = null
                } catch (exception: Exception) {
                  authError = exception.userMessage()
                } finally {
                  authBusy = false
                }
              }
            },
          )
        } else {
          LaunchedEffect(tokens) {
            val current = tokens ?: return@LaunchedEffect
            loading = true
            matchError = null
            try {
              val validTokens = ensureValidSession(api, tokenStore, current)
              if (validTokens != current) tokens = validTokens
              matches = api.getUpcomingMatches().data
              leaderboardLoading = true
              leaderboardError = null
              try {
                leaderboard = api.getLeaderboard().data
              } catch (exception: Exception) {
                leaderboardError = exception.userMessage()
              } finally {
                leaderboardLoading = false
              }
            } catch (exception: HttpException) {
              if (exception.code() == 401) {
                tokenStore.clear()
                tokens = null
                sentPhone = null
                authError = "انتهت الجلسة. سجّل الدخول مجدداً."
              } else {
                matchError = exception.userMessage()
              }
            } catch (exception: Exception) {
              matchError = exception.userMessage()
            } finally {
              loading = false
            }
          }

          HomeScreen(
            matches = matches,
            loading = loading,
            error = matchError,
            predictionMessage = predictionMessage,
            leaderboard = leaderboard,
            leaderboardLoading = leaderboardLoading,
            leaderboardError = leaderboardError,
            onRefreshLeaderboard = {
              scope.launch {
                leaderboardLoading = true
                leaderboardError = null
                try {
                  leaderboard = api.getLeaderboard().data
                } catch (exception: Exception) {
                  leaderboardError = exception.userMessage()
                } finally {
                  leaderboardLoading = false
                }
              }
            },
            onRefresh = {
              scope.launch {
                loading = true
                matchError = null
                try {
                  matches = api.getUpcomingMatches().data
                } catch (exception: Exception) {
                  matchError = exception.userMessage()
                } finally {
                  loading = false
                }
              }
            },
            onPredict = { matchId, homeGoals, awayGoals ->
              val current = tokens
              if (current != null) {
                scope.launch {
                  predictionMessage = null
                  try {
                    val validTokens = ensureValidSession(api, tokenStore, current)
                    if (validTokens != current) tokens = validTokens
                    api.savePrediction(
                      "Bearer ${validTokens.accessToken}",
                      CreatePredictionRequest(matchId, homeGoals, awayGoals),
                    )
                    predictionMessage = "تم حفظ توقعك بنجاح."
                  } catch (exception: HttpException) {
                    if (exception.code() == 401) {
                      tokenStore.clear()
                      tokens = null
                      authError = "انتهت الجلسة. سجّل الدخول مجدداً."
                    } else {
                      predictionMessage = exception.userMessage()
                    }
                  } catch (exception: Exception) {
                    predictionMessage = exception.userMessage()
                  }
                }
              }
            },
            onLogout = {
              tokenStore.clear()
              tokens = null
              sentPhone = null
              authError = null
              predictionMessage = null
            },
          )
        }
      }
    }
  }
}

private suspend fun ensureValidSession(
  api: TarehApi,
  tokenStore: TokenStore,
  current: StoredTokens,
): StoredTokens {
  try {
    api.getMe("Bearer ${current.accessToken}")
    return current
  } catch (exception: HttpException) {
    if (exception.code() != 401) throw exception
  }

  val refreshed = api.refreshSession(RefreshTokenRequest(current.refreshToken))
  val updated = StoredTokens(
    accessToken = refreshed.accessToken,
    refreshToken = refreshed.refreshToken,
  )
  tokenStore.save(updated)
  api.getMe("Bearer ${updated.accessToken}")
  return updated
}

private fun Exception.userMessage(): String = when (this) {
  is HttpException -> when (code()) {
    400 -> "انتهى وقت التوقع أو البيانات غير صحيحة."
    401 -> "رمز التحقق غير صحيح أو انتهت الجلسة."
    403 -> "هذا الحساب غير متاح."
    429 -> "طلبات كثيرة. انتظر قليلاً ثم حاول مجدداً."
    503 -> "خدمة إرسال الرسائل غير مهيأة حالياً."
    else -> "تعذر إكمال الطلب. حاول مرة أخرى."
  }
  else -> "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً."
}
