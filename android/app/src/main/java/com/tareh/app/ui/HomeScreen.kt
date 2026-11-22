package com.tareh.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.SportsSoccer
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tareh.app.model.MatchDto
import com.tareh.app.model.LeaderboardEntryDto
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val Gold = Color(0xFFE6B94F)
private val Muted = Color(0xFF9EADC2)
private val CardBackground = Color(0xFF111B2B)

@Composable
fun HomeScreen(
  matches: List<MatchDto>,
  loading: Boolean,
  error: String?,
  predictionMessage: String?,
  leaderboard: List<LeaderboardEntryDto>,
  leaderboardLoading: Boolean,
  leaderboardError: String?,
  onRefreshLeaderboard: () -> Unit,
  onRefresh: () -> Unit,
  onPredict: (String, Int, Int) -> Unit,
  onLogout: () -> Unit,
) {
  var selectedTab by remember { mutableIntStateOf(0) }

  Scaffold(
    containerColor = Color(0xFF080E1A),
    bottomBar = {
      NavigationBar(containerColor = Color(0xFF0D1727)) {
        val items = listOf(
          Triple("الرئيسية", Icons.Outlined.Home, 0),
          Triple("المباريات", Icons.Outlined.SportsSoccer, 1),
          Triple("التوقعات", Icons.Outlined.CalendarMonth, 2),
          Triple("الترتيب", Icons.Outlined.EmojiEvents, 3),
          Triple("حسابي", Icons.Outlined.PersonOutline, 4),
        )
        items.forEach { (label, icon, index) ->
          NavigationBarItem(
            selected = selectedTab == index,
            onClick = { selectedTab = index },
            icon = { Icon(icon, contentDescription = label) },
            label = { Text(label, fontSize = 10.sp) },
            alwaysShowLabel = true,
          )
        }
      }
    },
  ) { padding ->
    when (selectedTab) {
      0, 1 -> MatchHomeContent(
        matches = matches,
        loading = loading,
        error = error,
        predictionMessage = predictionMessage,
        onRefresh = onRefresh,
        onPredict = onPredict,
        modifier = Modifier.padding(padding),
      )
      3 -> LeaderboardScreen(
        entries = leaderboard,
        loading = leaderboardLoading,
        error = leaderboardError,
        onRefresh = onRefreshLeaderboard,
        modifier = Modifier.padding(padding),
      )
      else -> PlaceholderTab(
        title = if (selectedTab == 2) "التوقعات" else "حسابي",
        modifier = Modifier.padding(padding),
        onLogout = onLogout,
      )
    }
  }
}

@Composable
private fun MatchHomeContent(
  matches: List<MatchDto>,
  loading: Boolean,
  error: String?,
  predictionMessage: String?,
  onRefresh: () -> Unit,
  onPredict: (String, Int, Int) -> Unit,
  modifier: Modifier = Modifier,
) {
  LazyColumn(
    modifier = modifier.fillMaxSize(),
    contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 18.dp, bottom = 24.dp),
    verticalArrangement = Arrangement.spacedBy(15.dp),
  ) {
    item {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text("طارح", color = Gold, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
          Text("كرة القدم في متناولك", color = Muted, fontSize = 11.sp)
        }
        Surface(shape = CircleShape, color = Color(0xFF1B2940)) {
          Icon(
            Icons.Outlined.SportsSoccer,
            contentDescription = "طارح",
            tint = Gold,
            modifier = Modifier.padding(12.dp).size(24.dp),
          )
        }
      }
    }

    item {
      Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF17263D)),
      ) {
        Column(Modifier.padding(19.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
          Text("مرحباً بك في طارح", color = Gold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
          Text(
            "تابع المباريات وتوقّع النتيجة.",
            color = Color.White,
            fontSize = 23.sp,
            lineHeight = 31.sp,
            fontWeight = FontWeight.Bold,
          )
          Text("نتائج وإحصائيات ومسابقات توقعات مجانية.", color = Muted, fontSize = 11.sp)
        }
      }
    }

    item {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Text("المباريات القادمة", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Text("توقيت صنعاء", color = Muted, fontSize = 10.sp)
      }
    }

    if (predictionMessage != null) {
      item {
        Text(
          predictionMessage,
          color = if (predictionMessage.startsWith("تم")) Color(0xFF54D6A1) else Color(0xFFFFA1A1),
          fontSize = 11.sp,
          modifier = Modifier.fillMaxWidth().padding(horizontal = 3.dp),
        )
      }
    }

    when {
      loading -> item {
        Box(Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = Gold)
        }
      }
      error != null -> item {
        StateCard(
          title = "تعذر تحميل المباريات",
          message = "تحقق من اتصال الإنترنت والخادم، ثم أعد المحاولة.",
          action = "إعادة المحاولة",
          onAction = onRefresh,
        )
      }
      matches.isEmpty() -> item {
        StateCard(
          title = "لا توجد مباريات قادمة حالياً",
          message = "ستظهر هنا مباريات البطولات التي تم استيراد مواسمها من مزود البيانات.",
          action = null,
          onAction = {},
        )
      }
      else -> items(matches, key = { it.id }) { match ->
        MatchCard(match = match, onPredict = onPredict)
      }
    }
  }
}

@Composable
private fun MatchCard(
  match: MatchDto,
  onPredict: (String, Int, Int) -> Unit,
) {
  var homeGoals by remember(match.id) { mutableStateOf("") }
  var awayGoals by remember(match.id) { mutableStateOf("") }

  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(17.dp),
    colors = CardDefaults.cardColors(containerColor = CardBackground),
  ) {
    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Text(match.league.name, color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Medium)
        Text(
          text = match.status.toArabicStatus(),
          color = if (match.status in listOf("LIVE", "HALF_TIME", "PAUSED")) Color(0xFF54D6A1) else Gold,
          fontSize = 10.sp,
          fontWeight = FontWeight.SemiBold,
        )
      }
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        TeamColumn(match.homeTeam.name, Modifier.weight(1f))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(
            text = if (match.homeScore != null && match.awayScore != null)
              "${match.homeScore}  -  ${match.awayScore}" else "VS",
            color = Color.White,
            fontSize = 21.sp,
            fontWeight = FontWeight.ExtraBold,
          )
          Text(match.kickoffAt.toAdenTime(), color = Muted, fontSize = 10.sp)
        }
        TeamColumn(match.awayTeam.name, Modifier.weight(1f))
      }

      if (match.status == "SCHEDULED") {
        HorizontalDivider(color = Color(0xFF26364D))
        Text("توقع النتيجة مجاناً", color = Gold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(9.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          OutlinedTextField(
            value = homeGoals,
            onValueChange = { homeGoals = it.filter(Char::isDigit).take(2) },
            modifier = Modifier.weight(1f),
            label = { Text("أهداف ${match.homeTeam.shortName ?: "الأول"}", fontSize = 9.sp) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
          )
          Text(":", color = Muted, fontWeight = FontWeight.Bold)
          OutlinedTextField(
            value = awayGoals,
            onValueChange = { awayGoals = it.filter(Char::isDigit).take(2) },
            modifier = Modifier.weight(1f),
            label = { Text("أهداف ${match.awayTeam.shortName ?: "الثاني"}", fontSize = 9.sp) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
          )
        }
        Button(
          onClick = {
            val home = homeGoals.toIntOrNull()
            val away = awayGoals.toIntOrNull()
            if (home != null && away != null && home in 0..30 && away in 0..30) {
              onPredict(match.id, home, away)
            }
          },
          modifier = Modifier.fillMaxWidth(),
          enabled = homeGoals.toIntOrNull()?.let { it in 0..30 } == true &&
            awayGoals.toIntOrNull()?.let { it in 0..30 } == true,
        ) {
          Text("حفظ التوقع")
        }
      }
    }
  }
}

@Composable
private fun LeaderboardScreen(
  entries: List<LeaderboardEntryDto>,
  loading: Boolean,
  error: String?,
  onRefresh: () -> Unit,
  modifier: Modifier = Modifier,
) {
  Column(
    modifier = modifier
      .fillMaxSize()
      .background(Color(0xFF080E1A))
      .padding(horizontal = 18.dp, vertical = 18.dp),
    verticalArrangement = Arrangement.spacedBy(14.dp),
  ) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text("الترتيب العام", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
      Text("أفضل المشاركين حسب نقاط التوقعات المجانية", color = Muted, fontSize = 11.sp)
    }

    Card(
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(16.dp),
      colors = CardDefaults.cardColors(containerColor = Color(0xFF17263D)),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth().padding(15.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
          Text("الترتيب العام", color = Gold, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
          Text("الترتيب حسب مجموع النقاط", color = Muted, fontSize = 10.sp)
        }
        Icon(Icons.Outlined.EmojiEvents, contentDescription = null, tint = Gold, modifier = Modifier.size(30.dp))
      }
    }

    when {
      loading -> Box(
        modifier = Modifier.fillMaxWidth().weight(1f),
        contentAlignment = Alignment.Center,
      ) {
        CircularProgressIndicator(color = Gold)
      }
      error != null -> StateCard(
        title = "تعذر تحميل الترتيب",
        message = error,
        action = "إعادة المحاولة",
        onAction = onRefresh,
      )
      entries.isEmpty() -> StateCard(
        title = "لا توجد نقاط مسجلة بعد",
        message = "سيظهر ترتيب المشاركين بعد اعتماد نتائج المباريات واحتساب النقاط.",
        action = "تحديث",
        onAction = onRefresh,
      )
      else -> LazyColumn(
        modifier = Modifier.weight(1f),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp),
      ) {
        items(entries, key = { it.user.id }) { entry ->
          Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = CardBackground),
          ) {
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 13.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
              Box(
                modifier = Modifier.size(36.dp).clip(CircleShape)
                  .background(if (entry.rank <= 3) Color(0xFF4A3B20) else Color(0xFF22334B)),
                contentAlignment = Alignment.Center,
              ) {
                Text(
                  entry.rank.toString(),
                  color = if (entry.rank <= 3) Gold else Color.White,
                  fontWeight = FontWeight.Bold,
                  fontSize = 13.sp,
                )
              }
              Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                  entry.user.displayName,
                  color = Color.White,
                  fontSize = 12.sp,
                  fontWeight = FontWeight.SemiBold,
                  maxLines = 1,
                )
                Text(
                  "${entry.exactScorePredictions} نتيجة صحيحة بالكامل",
                  color = Muted,
                  fontSize = 9.sp,
                )
              }
              Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(entry.points.toString(), color = Gold, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Text("نقطة", color = Muted, fontSize = 9.sp)
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun TeamColumn(name: String, modifier: Modifier = Modifier) {
  Column(
    modifier = modifier,
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(7.dp),
  ) {
    Box(
      modifier = Modifier.size(38.dp).clip(CircleShape).background(Color(0xFF22334B)),
      contentAlignment = Alignment.Center,
    ) {
      Icon(Icons.Outlined.SportsSoccer, contentDescription = null, tint = Gold, modifier = Modifier.size(21.dp))
    }
    Text(
      text = name,
      color = Color(0xFFE8EDF5),
      fontSize = 11.sp,
      fontWeight = FontWeight.Medium,
      textAlign = TextAlign.Center,
      maxLines = 2,
    )
  }
}

@Composable
private fun StateCard(
  title: String,
  message: String,
  action: String?,
  onAction: () -> Unit,
) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(17.dp),
    colors = CardDefaults.cardColors(containerColor = CardBackground),
  ) {
    Column(
      modifier = Modifier.fillMaxWidth().padding(22.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(9.dp),
    ) {
      Icon(Icons.Outlined.SportsSoccer, contentDescription = null, tint = Gold, modifier = Modifier.size(30.dp))
      Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
      Text(message, color = Muted, textAlign = TextAlign.Center, fontSize = 10.sp)
      if (action != null) {
        Button(onClick = onAction) { Text(action) }
      }
    }
  }
}

@Composable
private fun PlaceholderTab(
  title: String,
  modifier: Modifier = Modifier,
  onLogout: () -> Unit,
) {
  Box(
    modifier = modifier.fillMaxSize().padding(24.dp),
    contentAlignment = Alignment.Center,
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text(title, color = Gold, fontSize = 20.sp, fontWeight = FontWeight.Bold)
      Text("هذه الصفحة ضمن المرحلة التالية من تطوير طارح.", color = Muted, fontSize = 12.sp)
      if (title == "حسابي") {
        Button(onClick = onLogout) {
          Text("تسجيل الخروج")
        }
      }
    }
  }
}

private fun String.toArabicStatus(): String = when (this) {
  "LIVE" -> "مباشرة"
  "HALF_TIME" -> "استراحة"
  "PAUSED" -> "متوقفة"
  "FINISHED" -> "انتهت"
  "POSTPONED" -> "مؤجلة"
  "CANCELLED" -> "ملغاة"
  "ABANDONED" -> "لم تكتمل"
  else -> "قادمة"
}

private fun String.toAdenTime(): String = runCatching {
  DateTimeFormatter.ofPattern("HH:mm", Locale("ar"))
    .withZone(ZoneId.of("Asia/Aden"))
    .format(Instant.parse(this))
}.getOrDefault("--:--")
