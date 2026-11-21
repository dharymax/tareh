package com.tareh.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tareh.app.R
import com.tareh.app.data.football.FootballApi
import com.tareh.app.data.football.FootballMatch
import com.tareh.app.ui.theme.TarehBackground
import com.tareh.app.ui.theme.TarehGold
import com.tareh.app.ui.theme.TarehMuted
import com.tareh.app.ui.theme.TarehRed
import com.tareh.app.ui.theme.TarehSurface
import com.tareh.app.ui.theme.TarehSurfaceAlt
import com.tareh.app.ui.theme.TarehText
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.CancellationException

private data class BottomDestination(
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

private val destinations = listOf(
    BottomDestination("الرئيسية", Icons.Default.Home),
    BottomDestination("المباريات", Icons.Default.CalendarMonth),
    BottomDestination("الترتيب", Icons.Default.EmojiEvents),
    BottomDestination("حسابي", Icons.Default.Person),
)

@Composable
fun TarehApp() {
    var selectedTab by remember { mutableIntStateOf(0) }
    var refreshKey by remember { mutableIntStateOf(0) }
    var matches by remember { mutableStateOf<List<FootballMatch>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(refreshKey) {
        isLoading = true
        errorMessage = null
        try {
            matches = FootballApi.getTodayMatches()
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (error: Exception) {
            errorMessage = error.message ?: "تعذر تحميل المباريات."
        } finally {
            isLoading = false
        }
    }

    val liveCount = matches.count {
        it.status == "LIVE" || it.status == "HALF_TIME" || it.status == "PAUSED"
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Scaffold(
            containerColor = TarehBackground,
            bottomBar = {
                NavigationBar(
                    containerColor = TarehSurface,
                    contentColor = TarehText,
                ) {
                    destinations.forEachIndexed { index, item ->
                        NavigationBarItem(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            icon = { Icon(item.icon, contentDescription = null) },
                            label = { Text(item.label, fontSize = 10.sp) },
                        )
                    }
                }
            },
        ) { innerPadding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 18.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item { TopBrandBar() }

                when (selectedTab) {
                    0 -> {
                        item { WelcomeCard() }
                        item { QuickSummary(matches.size, liveCount) }
                        item { MatchSectionHeader("مباريات اليوم", onRefresh = { refreshKey++ }) }
                        item {
                            MatchContent(
                                matches = matches,
                                isLoading = isLoading,
                                errorMessage = errorMessage,
                                onRetry = { refreshKey++ },
                            )
                        }
                        item { ProductFootnote() }
                    }

                    1 -> {
                        item { MatchSectionHeader("مباريات اليوم", onRefresh = { refreshKey++ }) }
                        item {
                            MatchContent(
                                matches = matches,
                                isLoading = isLoading,
                                errorMessage = errorMessage,
                                onRetry = { refreshKey++ },
                            )
                        }
                    }

                    2 -> item { FeaturePlaceholder(
                        title = "الترتيب",
                        description = "سيظهر ترتيب المشاركين بعد إطلاق نظام الحسابات والتوقعات المجانية.",
                    ) }

                    else -> item { FeaturePlaceholder(
                        title = "حسابي",
                        description = "تسجيل الحساب والملف الشخصي سيُتاحان بعد ربط خدمة التحقق من رقم الهاتف.",
                    ) }
                }
            }
        }
    }
}

@Composable
private fun TopBrandBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(
                painter = painterResource(R.drawable.tareh_logo),
                contentDescription = "شعار طارح",
                modifier = Modifier.size(58.dp),
                contentScale = ContentScale.Fit,
            )
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text("طارح", color = TarehGold, fontSize = 21.sp, fontWeight = FontWeight.Bold)
                Text("TAREH", color = TarehMuted, fontSize = 9.sp, letterSpacing = 2.sp)
            }
        }

        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(TarehSurfaceAlt)
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Text("منصة مجانية", color = TarehGold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun WelcomeCard() {
    Card(
        colors = CardDefaults.cardColors(containerColor = TarehSurfaceAlt),
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("مرحباً بك في طارح", color = TarehGold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text("كرة القدم كما تحبها", color = TarehText, fontSize = 23.sp, fontWeight = FontWeight.Bold)
            Text(
                "تابع المباريات والنتائج، وشارك في توقعات رياضية مجانية واجمع النقاط.",
                color = TarehMuted,
                fontSize = 12.sp,
                lineHeight = 21.sp,
            )
        }
    }
}

@Composable
private fun QuickSummary(matchCount: Int, liveCount: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SummaryCard(
            modifier = Modifier.weight(1f),
            title = "مباريات اليوم",
            value = matchCount.toString(),
        )
        SummaryCard(
            modifier = Modifier.weight(1f),
            title = "مباشر الآن",
            value = liveCount.toString(),
        )
    }
}

@Composable
private fun SummaryCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = TarehSurface),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(
            modifier = Modifier.padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(title, color = TarehMuted, fontSize = 11.sp)
            Text(value, color = TarehText, fontSize = 27.sp, fontWeight = FontWeight.Bold)
            Text("من بيانات الخادم", color = TarehMuted, fontSize = 9.sp)
        }
    }
}

@Composable
private fun MatchSectionHeader(title: String, onRefresh: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, color = TarehText, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        TextButton(onClick = onRefresh) {
            Text("تحديث", color = TarehGold, fontSize = 11.sp)
        }
    }
}

@Composable
private fun MatchContent(
    matches: List<FootballMatch>,
    isLoading: Boolean,
    errorMessage: String?,
    onRetry: () -> Unit,
) {
    when {
        isLoading -> StatusCard {
            CircularProgressIndicator(color = TarehGold, modifier = Modifier.size(30.dp), strokeWidth = 3.dp)
            Text("جارٍ تحميل المباريات من طارح…", color = TarehMuted, fontSize = 12.sp)
        }

        errorMessage != null -> StatusCard {
            Text("تعذر الاتصال بالخادم", color = TarehRed, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text(errorMessage, color = TarehMuted, fontSize = 11.sp, textAlign = TextAlign.Center)
            TextButton(onClick = onRetry) { Text("إعادة المحاولة", color = TarehGold) }
        }

        matches.isEmpty() -> StatusCard {
            Text("⚽", fontSize = 30.sp)
            Text("لا توجد مباريات مسجلة لهذا اليوم", color = TarehText, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "ستظهر المباريات هنا بعد مزامنة البطولات والمباريات من مزود البيانات.",
                color = TarehMuted,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
            )
            TextButton(onClick = onRetry) { Text("تحديث البيانات", color = TarehGold) }
        }

        else -> {
            matches.forEach { match ->
                MatchCard(match)
            }
        }
    }
}

@Composable
private fun StatusCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = TarehSurface),
        shape = RoundedCornerShape(18.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 28.dp, horizontal = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = content,
        )
    }
}

@Composable
private fun MatchCard(match: FootballMatch) {
    val isLive = match.status == "LIVE" || match.status == "HALF_TIME" || match.status == "PAUSED"
    val statusLabel = when (match.status) {
        "LIVE" -> "مباشرة"
        "HALF_TIME" -> "استراحة"
        "PAUSED" -> "متوقفة"
        "FINISHED" -> "انتهت"
        "POSTPONED" -> "مؤجلة"
        "CANCELLED" -> "ملغاة"
        "ABANDONED" -> "لم تكتمل"
        else -> "قادمة"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = TarehSurface),
        shape = RoundedCornerShape(17.dp),
    ) {
        Column(
            modifier = Modifier.padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(match.leagueName, color = TarehMuted, fontSize = 10.sp)
                Text(
                    statusLabel,
                    color = if (isLive) TarehRed else TarehGold,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    match.homeTeamName,
                    modifier = Modifier.weight(1f),
                    color = TarehText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Start,
                )
                Text(
                    scoreText(match),
                    modifier = Modifier.padding(horizontal = 12.dp),
                    color = TarehGold,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    match.awayTeamName,
                    modifier = Modifier.weight(1f),
                    color = TarehText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.End,
                )
            }

            Text(
                "موعد المباراة: ${formatKickoff(match.kickoffAt)}",
                color = TarehMuted,
                fontSize = 10.sp,
            )
        }
    }
}

private fun scoreText(match: FootballMatch): String {
    return if (match.homeScore == null || match.awayScore == null) {
        "– : –"
    } else {
        "${match.homeScore} : ${match.awayScore}"
    }
}

private fun formatKickoff(value: String): String {
    return try {
        val input = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US)
        input.timeZone = TimeZone.getTimeZone("UTC")
        val date = input.parse(value) ?: return value
        val output = SimpleDateFormat("h:mm a", Locale("ar", "YE"))
        output.timeZone = TimeZone.getTimeZone("Asia/Aden")
        output.format(date)
    } catch (_: Exception) {
        value
    }
}

@Composable
private fun FeaturePlaceholder(title: String, description: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = TarehSurface),
        shape = RoundedCornerShape(18.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(title, color = TarehGold, fontSize = 19.sp, fontWeight = FontWeight.Bold)
            Text(description, color = TarehMuted, fontSize = 12.sp, lineHeight = 21.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun ProductFootnote() {
    Text(
        "طارح منصة رياضية مجانية. النقاط افتراضية ولا تحمل قيمة مالية.",
        color = Color(0xFF75869B),
        fontSize = 10.sp,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 18.dp),
    )
}
