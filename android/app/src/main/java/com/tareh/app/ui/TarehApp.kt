package com.tareh.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.tareh.app.ui.theme.TarehBackground
import com.tareh.app.ui.theme.TarehGold
import com.tareh.app.ui.theme.TarehMuted
import com.tareh.app.ui.theme.TarehSurface
import com.tareh.app.ui.theme.TarehSurfaceAlt
import com.tareh.app.ui.theme.TarehText

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
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                item { TopBrandBar() }
                item { WelcomeCard() }
                item { QuickSummary() }
                item { MatchSectionHeader() }
                item { EmptyMatchesCard() }
                item { ProductFootnote() }
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
            Text("نقاطي  0", color = TarehGold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
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
            Text(
                "كرة القدم كما تحبها",
                color = TarehText,
                fontSize = 23.sp,
                fontWeight = FontWeight.Bold,
            )
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
private fun QuickSummary() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SummaryCard(
            modifier = Modifier.weight(1f),
            title = "مباريات اليوم",
            value = "—",
            helper = "بانتظار مزود البيانات",
        )
        SummaryCard(
            modifier = Modifier.weight(1f),
            title = "مباشر الآن",
            value = "—",
            helper = "تحديث مباشر لاحقاً",
        )
    }
}

@Composable
private fun SummaryCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    helper: String,
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
            Text(helper, color = TarehMuted, fontSize = 9.sp)
        }
    }
}

@Composable
private fun MatchSectionHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("مباريات اليوم", color = TarehText, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Text("عرض الكل", color = TarehGold, fontSize = 11.sp)
    }
}

@Composable
private fun EmptyMatchesCard() {
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
            verticalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(TarehSurfaceAlt),
                contentAlignment = Alignment.Center,
            ) {
                Text("⚽", fontSize = 25.sp)
            }
            Text("لا توجد مباريات معروضة حالياً", color = TarehText, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "ستظهر المباريات هنا بعد ربط خدمة البيانات الرياضية.",
                color = TarehMuted,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
            )
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
