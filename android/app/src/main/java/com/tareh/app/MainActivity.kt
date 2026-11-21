package com.tareh.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tareh.app.data.TarehApi
import com.tareh.app.data.TarehNetwork
import com.tareh.app.model.MatchDto
import com.tareh.app.ui.HomeScreen
import com.tareh.app.ui.TarehTheme
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    val api = TarehNetwork.create().create(TarehApi::class.java)

    setContent {
      TarehTheme {
        var matches by remember { mutableStateOf<List<MatchDto>>(emptyList()) }
        var loading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }

        fun refresh() {
          loading = true
          error = null
          lifecycleScope.launch {
            try {
              matches = api.getTodayMatches().data
            } catch (exception: Exception) {
              error = exception.message ?: "تعذر الاتصال بالخادم"
            } finally {
              loading = false
            }
          }
        }

        androidx.compose.runtime.LaunchedEffect(Unit) {
          refresh()
        }

        HomeScreen(
          matches = matches,
          loading = loading,
          error = error,
          onRefresh = ::refresh,
        )
      }
    }
  }
}
