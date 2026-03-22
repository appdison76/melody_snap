/**
 * melody_snap 전용: 영상 검색만 제공 (다운로드/파일 저장/썸네일 캐시 없음)
 */
import { fetchWithFallback } from '../config/api';

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
