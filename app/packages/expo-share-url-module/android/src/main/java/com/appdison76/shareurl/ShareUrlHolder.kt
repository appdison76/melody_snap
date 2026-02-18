package com.appdison76.shareurl

/**
 * Cold start 시 React Native가 로드되기 전에 받은 공유 URL을 보관.
 * ShareUrlModule이 생성될 때 여기서 꺼내서 이벤트로 전달.
 */
object ShareUrlHolder {
  @Volatile
  var pendingUrl: String? = null

  @JvmStatic
  fun takePendingUrl(): String? {
    val url = pendingUrl
    pendingUrl = null
    return url
  }
}
