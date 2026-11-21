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
import com.tareh.app.model.MatchDto
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
              val validTokens = try {
                api.getMe("Bearer ${current.accessToken}")
                current
              } catch (exception: HttpException) {
                if (exception.code() != 401) throw exception
                val refreshed = api.refreshSession(
                  RefreshTokenRequest(current.refreshToken),
                )
                StoredTokens(
                  accessToken = refreshed.accessToken,
                  refreshToken = refreshed.refreshToken,
                )
              }

              if (validTokens != current) {
                tokenStore.save(validTokens)
                tokens = validTokens
              }
              api.getMe("Bearer ${validTokens.accessToken}")
              matches = api.getTodayMatches().data
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
            onRefresh = {
              scope.launch {
                loading = true
                matchError = null
                try {
                  matches = api.getTodayMatches().data
                } catch (exception: Exception) {
                  matchError = exception.userMessage()
                } finally {
                  loading = false
                }
              }
            },
            onLogout = {
              tokenStore.clear()
              tokens = null
              sentPhone = null
              authError = null
            },
          )
        }
      }
    }
  }
}

private fun Exception.userMessage(): String = when (this) {
  is HttpException -> when (code()) {
    400 -> "البيانات المدخلة غير صحيحة."
    401 -> "رمز التحقق غير صحيح أو انتهت الجلسة."
    429 -> "طلبات كثيرة. انتظر قليلاً ثم حاول مجدداً."
    503 -> "خدمة إرسال الرسائل غير مهيأة حالياً."
    else -> "تعذر إكمال الطلب. حاول مرة أخرى."
  }
  else -> "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً."
}
