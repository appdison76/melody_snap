package com.appdison76.shareurl

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShareUrlModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ShareUrlModule")

    Events("onSharedUrl")

    OnCreate {
      Companion.instance = this@ShareUrlModule
      ShareUrlHolder.takePendingUrl()?.let { url ->
        sendEvent("onSharedUrl", mapOf("url" to url))
      }
    }

    OnDestroy {
      Companion.instance = null
    }

    Function("getInitialShareUrl") {
      ShareUrlHolder.takePendingUrl()?.let { return@Function it }
      val activity = appContext.currentActivity ?: return@Function null
      val intent = activity.intent ?: return@Function null
      if (Intent.ACTION_SEND != intent.action) return@Function null
      val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim() ?: return@Function null
      if (text.isEmpty()) return@Function null
      extractYoutubeUrlFromText(text)
    }
  }

  /** MainActivity.handleShareIntent와 동일: 본문 속 첫 유튜브 URL만 */
  private fun extractYoutubeUrlFromText(text: String): String? {
    val urlPattern = Regex("(https?://[a-zA-Z0-9\\-._~:/?#\\[\\]@!$&'()*+,;=]+)")
    val match = urlPattern.find(text) ?: return null
    val url = match.value
    return url.takeIf { url.contains("youtube") || url.contains("youtu.be") }
  }

  companion object {
    @Volatile
    var instance: ShareUrlModule? = null

    @JvmStatic
    fun notifySharedUrl(url: String) {
      instance?.sendEvent("onSharedUrl", mapOf("url" to url))
    }
  }
}
