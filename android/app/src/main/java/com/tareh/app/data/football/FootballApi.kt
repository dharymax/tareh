package com.tareh.app.data.football

import com.tareh.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class FootballMatch(
    val id: String,
    val kickoffAt: String,
    val status: String,
    val homeScore: Int?,
    val awayScore: Int?,
    val leagueName: String,
    val homeTeamName: String,
    val awayTeamName: String,
)

object FootballApi {
    suspend fun getTodayMatches(): List<FootballMatch> = withContext(Dispatchers.IO) {
        val endpoint = "${BuildConfig.API_BASE_URL.trimEnd('/')}/matches/today"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8_000
            readTimeout = 8_000
            setRequestProperty("Accept", "application/json")
        }

        try {
            val statusCode = connection.responseCode
            val stream = if (statusCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }
            val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()

            if (statusCode !in 200..299) {
                throw IOException("خادم طارح أعاد رمز HTTP $statusCode")
            }

            parseMatches(body)
        } finally {
            connection.disconnect()
        }
    }

    internal fun parseMatches(json: String): List<FootballMatch> {
        val root = JSONObject(json)
        val data = root.optJSONArray("data")
            ?: throw IOException("استجابة المباريات لا تحتوي على data")

        return buildList(data.length()) {
            for (index in 0 until data.length()) {
                val match = data.getJSONObject(index)
                val home = match.getJSONObject("homeTeam")
                val away = match.getJSONObject("awayTeam")
                val league = match.getJSONObject("league")

                add(
                    FootballMatch(
                        id = match.getString("id"),
                        kickoffAt = match.getString("kickoffAt"),
                        status = match.getString("status"),
                        homeScore = match.nullableInt("homeScore"),
                        awayScore = match.nullableInt("awayScore"),
                        leagueName = league.optString("name", "بطولة"),
                        homeTeamName = home.optString("name", "الفريق الأول"),
                        awayTeamName = away.optString("name", "الفريق الثاني"),
                    ),
                )
            }
        }
    }

    private fun JSONObject.nullableInt(key: String): Int? {
        if (!has(key) || isNull(key)) return null
        return getInt(key)
    }
}
