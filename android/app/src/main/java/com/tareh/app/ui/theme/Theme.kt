package com.tareh.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val TarehDarkColorScheme = darkColorScheme(
    primary = TarehGold,
    onPrimary = TarehBackground,
    secondary = TarehGoldSoft,
    onSecondary = TarehBackground,
    background = TarehBackground,
    onBackground = TarehText,
    surface = TarehSurface,
    onSurface = TarehText,
    surfaceVariant = TarehSurfaceAlt,
    onSurfaceVariant = TarehMuted,
    error = TarehRed,
)

@Composable
fun TarehTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TarehDarkColorScheme,
        content = content,
    )
}
