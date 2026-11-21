package com.tareh.app.data

import com.tareh.app.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object TarehNetwork {
  fun create(): Retrofit {
    val baseUrl = BuildConfig.API_BASE_URL.let {
      if (it.endsWith('/')) it else "$it/"
    }
    return Retrofit.Builder()
      .baseUrl(baseUrl)
      .addConverterFactory(GsonConverterFactory.create())
      .build()
  }
}
