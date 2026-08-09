import { AppOpenAd, AdEventType } from 'react-native-google-mobile-ads';

/** MelodySnap Play — cold start 시 1회 (백그라운드 복귀 X) */
const APP_OPEN_AD_UNIT_ID = 'ca-app-pub-2041836899811349/9546124002';

let appOpenAd = null;
let isShowing = false;
/** 프로세스(세션)당 1회 — 앱 완전 종료 후 재실행 시 JS가 새로 뜨면 다시 false */
let shownThisSession = false;
let pendingShow = false;

function getOrCreateAd() {
  if (appOpenAd) return appOpenAd;

  appOpenAd = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
    if (pendingShow && !shownThisSession && !isShowing) {
      showInternal();
    }
  });

  appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
    isShowing = false;
    appOpenAd?.load();
  });

  appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
    isShowing = false;
    pendingShow = false;
    console.warn('[AppOpenAd] error', error?.message || error);
  });

  return appOpenAd;
}

function showInternal() {
  if (shownThisSession || isShowing || !appOpenAd?.loaded) return;
  try {
    isShowing = true;
    shownThisSession = true;
    pendingShow = false;
    appOpenAd.show();
  } catch (e) {
    isShowing = false;
    pendingShow = false;
    console.warn('[AppOpenAd] show failed', e?.message || e);
  }
}

/** 앱 시작 시 미리 로드 (cold start용) */
export function prepareColdStartAppOpenAd() {
  const ad = getOrCreateAd();
  ad.load();
}

/** 버전 체크 등 초기화 후 cold start 1회 표시 시도 */
export function showColdStartAppOpenAdIfReady() {
  if (shownThisSession || isShowing) return;
  pendingShow = true;
  const ad = getOrCreateAd();
  if (ad.loaded) {
    showInternal();
  } else {
    ad.load();
  }
}
