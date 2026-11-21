package com.tareh.app

import org.junit.Assert.assertEquals
import org.junit.Test

class ExampleUnitTest {
    @Test
    fun applicationId_isTareh() {
        assertEquals("com.tareh.app", BuildConfig.APPLICATION_ID)
    }
}
