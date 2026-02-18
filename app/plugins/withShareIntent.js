/**
 * Prebuild 시에도 공유받기(SEND) intent가 유지되도록 AndroidManifest + MainActivity 주입.
 * prebuild --clean 해도 이 플러그인이 적용되므로 공유하기 기능이 사라지지 않음.
 */
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');
const { getMainActivity } = require('@expo/config-plugins/build/android/Manifest');

const SHARE_INTENT_MARKER = 'handleShareIntent';

function addShareIntentFilters(androidManifest) {
  const mainActivity = getMainActivity(androidManifest);
  if (!mainActivity) return androidManifest;

  const filters = mainActivity['intent-filter'] || [];
  const hasSend = filters.some(
    (f) => f.action?.some?.((a) => a.$?.['android:name'] === 'android.intent.action.SEND')
  );
  if (hasSend) return androidManifest;

  // 공유받기 (SEND)
  mainActivity['intent-filter'] = filters.concat({
    $: { 'android:label': '@string/app_name' },
    action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
    category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
    data: [{ $: { 'android:mimeType': 'text/plain' } }],
  });

  // YouTube URL 직접 열기 (선택)
  const hasYoutube = filters.some(
    (f) =>
      f.data?.some?.((d) => d.$?.['android:host'] === 'www.youtube.com' || d.$?.['android:host'] === 'youtu.be')
  );
  if (!hasYoutube) {
    mainActivity['intent-filter'] = mainActivity['intent-filter'].concat(
      {
        $: {},
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [
          { $: { 'android:scheme': 'http' } },
          { $: { 'android:scheme': 'https' } },
          { $: { 'android:host': 'www.youtube.com', 'android:pathPrefix': '/watch' } },
        ],
      },
      {
        $: {},
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [
          { $: { 'android:scheme': 'http' } },
          { $: { 'android:scheme': 'https' } },
          { $: { 'android:host': 'youtu.be' } },
        ],
      }
    );
  }

  return androidManifest;
}

function withShareIntentManifest(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addShareIntentFilters(config.modResults);
    return config;
  });
}

function withShareIntentMainActivity(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(SHARE_INTENT_MARKER)) return config;

    // Import 추가
    if (!contents.includes('ShareUrlHolder')) {
      if (!contents.includes('import android.content.Intent')) {
        contents = contents.replace(/(import android\.os\.Bundle)/, 'import android.content.Intent\n$1');
      }
      contents = contents.replace(
        /(import expo\.modules\.ReactActivityDelegateWrapper)/,
        'import com.appdison76.shareurl.ShareUrlHolder\nimport com.appdison76.shareurl.ShareUrlModule\n$1'
      );
    }

    // onCreate 안에 handleShareIntent(intent) 추가
    if (!contents.includes('handleShareIntent(intent)')) {
      contents = contents.replace(
        /super\.onCreate\(null\)\s*\n(\s*)\}/m,
        'super.onCreate(null)\n$1handleShareIntent(intent)\n$1}'
      );
    }

    // onNewIntent + handleShareIntent 메서드 추가
    if (!contents.includes('onNewIntent')) {
      const shareBlock = `
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { setIntent(it); handleShareIntent(it) }
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent?.action != Intent.ACTION_SEND) return
    val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim() ?: return
    if (text.isEmpty()) return
    if (!text.startsWith("http") && !text.contains("youtube") && !text.contains("youtu.be")) return
    val url = if (text.startsWith("http")) text else "https://$text"
    ShareUrlHolder.pendingUrl = url
    ShareUrlModule.notifySharedUrl(url)
  }

  /**
`;
      contents = contents.replace(/(\s*\/\*\*\s*\n\s*\* Align the back button)/, shareBlock + '$1');
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withShareIntent(config) {
  config = withShareIntentManifest(config);
  config = withShareIntentMainActivity(config);
  return config;
}

module.exports = withShareIntent;
