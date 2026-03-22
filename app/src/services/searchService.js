/**
 * melody_snap 전용: 영상 검색만 제공 (다운로드/파일 저장/썸네일 캐시 없음)
 */
import { fetchWithFallback } from '../config/api';

/** 웹 저장(save.js)과 동일: 붙여넣기 문자열을 watch URL로 정규화 (영상 ID만, youtu.be/…, www… 등) */
export const normalizeYoutubeUrlInput = (raw) => {
  let u = (raw || '').trim();
  if (!u) return '';
  if (/^[a-zA-Z0-9_-]{10,}$/.test(u)) {
    return `https://www.youtube.com/watch?v=${u}`;
  }
  if (/^youtu\.be\//i.test(u) && !/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  } else if (/^www\.(youtube\.com|youtu\.be)/i.test(u) && !/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  } else if (/^youtube\.com/i.test(u) && !/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  if (u.startsWith(':om/') || u.startsWith('om/')) {
    u = `https://www.youtub${u}`;
  }
  return u;
};

/**
 * 가져오기 화면용: youtube_down SearchScreen과 같이 YouTube oEmbed를 먼저 써서 체감 속도를 맞춤.
 * oEmbed 실패 시에만 서버 POST /api/video-info (웹 save.js와 동일한 폴백 순서의 반대).
 */
export const fetchVideoInfoByUrl = async (normalizedUrl, videoId) => {
  const fromOEmbed = async () => {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
    const r = await fetch(oEmbedUrl);
    if (!r.ok) {
      throw new Error(`oEmbed HTTP ${r.status}`);
    }
    const d = await r.json();
    return {
      id: videoId,
      title: decodeHtmlEntities(d.title || `Video (${videoId})`),
      url: normalizedUrl,
      thumbnail: d.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      author: decodeHtmlEntities(d.author_name || ''),
      authorUrl: d.author_url || '',
    };
  };

  try {
    return await fromOEmbed();
  } catch (oEmbedErr) {
    console.warn('[searchService] oEmbed failed, trying /api/video-info:', oEmbedErr?.message || oEmbedErr);
    try {
      const response = await fetchWithFallback('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      return {
        id: videoId,
        title: decodeHtmlEntities(data.title || `Video (${videoId})`),
        url: normalizedUrl,
        thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        author: decodeHtmlEntities(data.author || ''),
        authorUrl: '',
      };
    } catch (apiErr) {
      throw apiErr;
    }
  }
};

const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

/** 영상 검색 */
export const searchVideos = async (searchQuery, maxResults = 20) => {
  try {
    console.log('[searchService] Searching videos for:', searchQuery);
    const response = await fetchWithFallback('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: searchQuery, maxResults }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || '검색에 실패했습니다.');
    }
    const data = await response.json();
    const items = data.items || [];

    // Serper 폴백 시 channelId 없을 수 있음 (youtube_down downloadService와 동일)
    const results = items.map((item) => {
      const ch = item.snippet?.channelTitle || '';
      const cid = item.snippet?.channelId;
      const authorUrl = cid
        ? `https://www.youtube.com/channel/${cid}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(ch)}`;
      return {
        id: item.id?.videoId,
        title: decodeHtmlEntities(item.snippet?.title || ''),
        url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
        thumbnail:
          item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        author: decodeHtmlEntities(ch),
        authorUrl,
        description: decodeHtmlEntities(item.snippet?.description || ''),
        publishedAt: item.snippet?.publishedAt,
      };
    });
    return results.filter((r) => r && r.id);
  } catch (error) {
    console.error('[searchService] Error searching videos:', error);
    throw error;
  }
};

/** 자동완성 */
export const getAutocomplete = async (query) => {
  try {
    if (!query || query.trim().length < 2) return [];
    const response = await fetchWithFallback('/api/autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query.trim() }),
    });
    if (!response.ok) {
      if (response.status !== 400) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[searchService] Autocomplete server error:', response.status, errorData.error || '');
      }
      return [];
    }
    const suggestions = await response.json();
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    console.warn('[searchService] Autocomplete failed (non-critical):', error.message);
    return [];
  }
};
