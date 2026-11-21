package com.tareh.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val TarehColors = darkColorScheme(
  primary = Color(0xFFE6B94F),
  onPrimary = Color(0xFF17130A),
  secondary = Color(0xFF8FA4C2),
  background = Color(0xFF080E1A),
  surface = Color(0xFF111B2B),
  surfaceVariant = Color(0xFF1A2940),
  onBackground = Color(0xFFF2F5FA),
  onSurface = Color(0xFFF2F5FA),
)

@Composable
fun TarehTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colorScheme = TarehColors,
    content = content,
  )
}
