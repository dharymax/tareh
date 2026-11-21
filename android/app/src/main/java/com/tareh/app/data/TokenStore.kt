package com.tareh.app.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

data class StoredTokens(
  val accessToken: String,
  val refreshToken: String,
)

class TokenStore(context: Context) {
  private val preferences = context.applicationContext.getSharedPreferences(
    "tareh_secure_tokens",
    Context.MODE_PRIVATE,
  )

  fun save(tokens: StoredTokens) {
    val payload = JSONObject()
      .put("accessToken", tokens.accessToken)
      .put("refreshToken", tokens.refreshToken)
      .toString()
      .toByteArray(Charsets.UTF_8)

    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
    val encrypted = cipher.doFinal(payload)

    val saved = preferences.edit()
      .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
      .putString(KEY_DATA, Base64.encodeToString(encrypted, Base64.NO_WRAP))
      .commit()

    check(saved) { "Could not persist encrypted TAREH session tokens." }
  }

  fun read(): StoredTokens? {
    val ivText = preferences.getString(KEY_IV, null) ?: return null
    val dataText = preferences.getString(KEY_DATA, null) ?: return null

    return try {
      val iv = Base64.decode(ivText, Base64.NO_WRAP)
      val encrypted = Base64.decode(dataText, Base64.NO_WRAP)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
      val json = JSONObject(String(cipher.doFinal(encrypted), Charsets.UTF_8))
      StoredTokens(
        accessToken = json.getString("accessToken"),
        refreshToken = json.getString("refreshToken"),
      )
    } catch (_: Exception) {
      clear()
      null
    }
  }

  fun clear() {
    preferences.edit().clear().commit()
  }

  private fun getOrCreateKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
    val existing = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
    if (existing != null) return existing

    val generator = KeyGenerator.getInstance(
      KeyProperties.KEY_ALGORITHM_AES,
      ANDROID_KEY_STORE,
    )
    generator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true)
        .build(),
    )
    return generator.generateKey()
  }

  private companion object {
    const val ANDROID_KEY_STORE = "AndroidKeyStore"
    const val KEY_ALIAS = "com.tareh.app.session.aes"
    const val TRANSFORMATION = "AES/GCM/NoPadding"
    const val KEY_IV = "iv"
    const val KEY_DATA = "ciphertext"
  }
}
