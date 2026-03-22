/**
 * 유튜브 공유 인텐트 / 딥링크용 (App.js, AppNavigator, ImportScreen에서 공통 사용)
 */

export const YOUTUBE_URL_IN_TEXT =
  /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=[^&\s]+|shorts\/[^?\s]+|live\/[^?\s]+)|youtu\.be\/[^?\s]+)/i;

export function extractYoutubeUrlFromShare(text) {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  const m = t.match(YOUTUBE_URL_IN_TEXT);
  if (m) return m[0].trim();
  if (/youtu\.be|youtube\.com/i.test(t)) {
    const parts = t.split(/\s+/);
    const hit = parts.find((p) => /youtu\.be|youtube\.com/i.test(p));
    if (hit) return hit.trim();
  }
  return t;
}

export function normalizeYouTubeShareUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('si');
    return u.toString();
  } catch {
    return url.trim();
  }
}

/** AppNavigator: watch / live / shorts → 표준 URL (Import·API용) */
export function normalizeYoutubeNavigationUrl(urlToNavigate) {
  let u = (urlToNavigate || '').trim();
  if (!u) return u;

  if (u.startsWith('exp+app://') || u.startsWith('exp://')) {
    try {
      const urlObj = new URL(u);
      const p = urlObj.searchParams.get('url');
      if (p) u = decodeURIComponent(p);
    } catch {
      const urlMatch = u.match(/[?&]url=([^&]+)/);
      if (urlMatch) u = decodeURIComponent(urlMatch[1]);
    }
  }

  if (u.startsWith(':om/') || u.startsWith('om/') || u.startsWith('be.com/')) {
    u = u.startsWith('be.com/') ? `https://www.youtu${u}` : `https://www.youtub${u}`;
  }

  const watchMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
  const liveMatch = u.match(/youtube\.com\/live\/([^&\s?]+)/);
  const shortsMatch = u.match(/youtube\.com\/shorts\/([^&\s/?]+)/);

  if (watchMatch) {
    const videoId = watchMatch[1].split('?')[0].split('&')[0];
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (liveMatch) {
    const liveId = liveMatch[1].split('?')[0].split('&')[0];
    return `https://www.youtube.com/live/${liveId}`;
  }
  if (shortsMatch) {
    const sid = shortsMatch[1].split('?')[0].split('&')[0];
    return `https://www.youtube.com/watch?v=${sid}`;
  }
  return u;
}

/** React state 갱신용: URL에 이미 ?가 있으면 &t= 로 붙임 */
export function appendTimestampQuery(url) {
  if (!url || typeof url !== 'string') return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${Date.now()}`;
}

/** appendTimestampQuery로 붙인 ms 타임스탬프만 제거 (짧은 재생 위치 t=120 등은 유지) */
export function stripNavigationTimestampBust(url) {
  if (!url || typeof url !== 'string') return url;
  let u = url.replace(/[?&]t=\d{12,}$/, '');
  if (u.endsWith('?') || u.endsWith('&')) u = u.slice(0, -1);
  return u;
}
