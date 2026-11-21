package com.tareh.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.SportsSoccer
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Gold = Color(0xFFE6B94F)
private val Muted = Color(0xFF9EADC2)

@Composable
fun LoginScreen(
  busy: Boolean,
  sentPhone: String?,
  error: String?,
  onSendOtp: (String) -> Unit,
  onVerifyOtp: (String, String) -> Unit,
) {
  var phone by remember { mutableStateOf("") }
  var code by remember { mutableStateOf("") }

  Surface(
    modifier = Modifier.fillMaxSize(),
    color = Color(0xFF080E1A),
  ) {
    Box(
      modifier = Modifier.fillMaxSize().padding(24.dp),
      contentAlignment = Alignment.Center,
    ) {
      Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(13.dp),
      ) {
        Surface(shape = CircleShape, color = Color(0xFF1A2940)) {
          Icon(
            Icons.Outlined.SportsSoccer,
            contentDescription = "شعار طارح",
            tint = Gold,
            modifier = Modifier.padding(19.dp).size(43.dp),
          )
        }
        Text("طارح", color = Gold, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
        Text("كرة القدم في متناولك", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(13.dp))
        Text("تسجيل الدخول", color = Color.White, fontSize = 19.sp, fontWeight = FontWeight.Bold)
        Text(
          "أدخل رقم هاتفك اليمني للمتابعة",
          color = Muted,
          fontSize = 11.sp,
          textAlign = TextAlign.Center,
        )

        OutlinedTextField(
          value = phone,
          onValueChange = { phone = it.filter { char -> char.isDigit() || char == '+' }.take(16) },
          modifier = Modifier.fillMaxWidth(),
          enabled = sentPhone == null && !busy,
          label = { Text("رقم الهاتف") },
          placeholder = { Text("777123456") },
          singleLine = true,
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
          shape = RoundedCornerShape(13.dp),
        )

        if (sentPhone == null) {
          Button(
            onClick = { onSendOtp(normalizeYemenPhone(phone)) },
            modifier = Modifier.fillMaxWidth().height(49.dp),
            enabled = !busy && normalizeYemenPhone(phone).isNotEmpty(),
          ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.size(19.dp), strokeWidth = 2.dp)
            else Text("إرسال رمز التحقق")
          }
        } else {
          Text(
            "أدخل الرمز المرسل إلى $sentPhone",
            color = Muted,
            fontSize = 10.sp,
          )
          OutlinedTextField(
            value = code,
            onValueChange = { code = it.filter(Char::isDigit).take(6) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !busy,
            label = { Text("رمز التحقق") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            shape = RoundedCornerShape(13.dp),
          )
          Button(
            onClick = { onVerifyOtp(sentPhone, code) },
            modifier = Modifier.fillMaxWidth().height(49.dp),
            enabled = !busy && code.length == 6,
          ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.size(19.dp), strokeWidth = 2.dp)
            else Text("تأكيد وتسجيل الدخول")
          }
          TextButton(
            onClick = {
              code = ""
              onSendOtp(sentPhone)
            },
            enabled = !busy,
          ) {
            Text("إعادة طلب الرمز", color = Gold, fontSize = 11.sp)
          }
        }

        if (error != null) {
          Text(error, color = Color(0xFFFF8A8A), fontSize = 10.sp, textAlign = TextAlign.Center)
        }

        Text(
          "منصة رياضية مجانية. النقاط للتنافس والترتيب فقط ولا تحمل قيمة مالية.",
          color = Color(0xFF71819A),
          fontSize = 9.sp,
          textAlign = TextAlign.Center,
        )
      }
    }
  }
}

private fun normalizeYemenPhone(value: String): String {
  val digits = value.filter(Char::isDigit)
  val national = when {
    digits.startsWith("967") -> digits.drop(3)
    digits.startsWith("0") -> digits.drop(1)
    else -> digits
  }
  return if (national.length == 9 && national.startsWith("7")) "+967$national" else ""
}
