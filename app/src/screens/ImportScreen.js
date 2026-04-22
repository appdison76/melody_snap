import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  Linking,
  Alert,
  AppState,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../locales/translations';
import { addFavorite, removeFavorite, getFavorites, initDatabase } from '../services/database';
import { openLinkDownWithFlag } from '../config/api';
import { normalizeYoutubeUrlInput, fetchVideoInfoByUrl } from '../services/searchService';
import { normalizeYoutubeNavigationUrl, stripNavigationTimestampBust } from '../utils/youtubeShare';
import InlineNativeAd from '../components/InlineNativeAd';

/**
 * youtube_down 앱 SearchScreen(저장/URL 가져오기) 레이아웃과 동일.
 * — 입력+가져오기 한 줄, 빈 화면 📺 펄스·공유·탭하여 클립보드, 결과는 세로 썸네일 카드+3버튼
 */
export default function ImportScreen({ navigation, route }) {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage] || translations.ko || {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const lastProcessedUrl = useRef(null);
  const textInputRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  /** 언어 변경 시에도 handleSearchWithUrl 참조를 고정 → route effect가 공유 URL을 다시 fetch하지 않음 (youtube_down SearchScreen과 동일) */
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!route?.params?.url) {
      setQuery('');
    }
  }, []);

  useEffect(() => {
    initDatabase().catch(() => {});
  }, []);

  const loadFavoriteIds = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavorites(new Set(favs.map((f) => f.id || f.video_id)));
    } catch (e) {
      console.warn('[ImportScreen] loadFavoriteIds', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavoriteIds();
    }, [loadFavoriteIds])
  );

  useEffect(() => {
    if (results.length === 0 && !loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [results.length, loading, pulseAnim]);

  const handleSearchWithUrl = useCallback(
    async (url) => {
      if (!url || url.trim() === '') return;

      setLoading(true);
      setResults([]);

      let cleanUrl = normalizeYoutubeUrlInput(url);
      if (cleanUrl.startsWith('be.com/')) {
        cleanUrl = `https://www.youtu${cleanUrl}`;
      }
      cleanUrl = normalizeYoutubeNavigationUrl(cleanUrl);

      let videoId = null;
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/,
        /youtube\.com\/watch\?.*v=([^&\s?]+)/,
        /youtu\.be\/([^&\s?]+)/,
        /youtube\.com\/shorts\/([^&\s/?]+)/,
        /youtube\.com\/live\/([^&\s/?]+)/,
      ];
      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match) {
          videoId = match[1].split('?')[0].split('&')[0];
          break;
        }
      }

      if (!videoId) {
        setLoading(false);
        const tr = tRef.current;
        Alert.alert(tr.error, tr.ytUrlError);
        return;
      }

      const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // 수동 가져오기에서 navigation.setParams를 쓰면 route effect가 processSharedUrl을 돌려
      // setLoading(false)·setResults([])로 첫 요청을 깨뜨릴 수 있음 → 여기서는 params 갱신 안 함.
      try {
        const result = await fetchVideoInfoByUrl(normalizedUrl, videoId);
        setResults([result]);
      } catch (e) {
        console.warn('[ImportScreen] fetchVideoInfoByUrl failed:', e?.message || e);
        setResults([
          {
            id: videoId,
            title: `Video (${videoId})`,
            url: normalizedUrl,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            author: '',
            authorUrl: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const processSharedUrl = useCallback(
    (urlParam, timestamp, forceUpdate, forceReload) => {
      if (!urlParam) return;
      let sharedUrl = stripNavigationTimestampBust(urlParam.trim());
      const isNewShare = timestamp !== null && timestamp !== undefined;
      const shouldUpdate =
        forceUpdate || forceReload || isNewShare || lastProcessedUrl.current !== sharedUrl;
      if (!shouldUpdate) return;
      lastProcessedUrl.current = sharedUrl;

      if (forceReload) {
        setQuery('');
        setResults([]);
        setLoading(false);
      } else {
        setResults([]);
        setLoading(false);
      }

      sharedUrl = normalizeYoutubeNavigationUrl(sharedUrl);
      setQuery(sharedUrl);
      setTimeout(() => handleSearchWithUrl(sharedUrl), 100);
    },
    [handleSearchWithUrl]
  );

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      const urlParam = route?.params?.url;
      const timestamp = route?.params?.timestamp;
      const forceUpdate = route?.params?.forceUpdate;
      const forceReload = route?.params?.forceReload;
      if (urlParam) {
        setTimeout(() => processSharedUrl(urlParam, timestamp, forceUpdate, forceReload), 100);
      }
    });
    return unsub;
  }, [navigation, route?.params, processSharedUrl]);

  useEffect(() => {
    const urlParam = route?.params?.url;
    const timestamp = route?.params?.timestamp;
    const forceUpdate = route?.params?.forceUpdate;
    const forceReload = route?.params?.forceReload;
    if (urlParam) {
      const id = setTimeout(() => processSharedUrl(urlParam, timestamp, forceUpdate, forceReload), 50);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [route?.params?.url, route?.params?.timestamp, route?.params?.forceUpdate, route?.params?.forceReload, processSharedUrl]);

  useEffect(() => {
    let timeout;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        timeout = setTimeout(() => {
          const urlParam = route?.params?.url;
          const timestamp = route?.params?.timestamp;
          if (urlParam && lastProcessedUrl.current !== stripNavigationTimestampBust(urlParam.trim())) {
            processSharedUrl(urlParam, timestamp, true, false);
          }
        }, 300);
      }
    });
    return () => {
      sub.remove();
      if (timeout) clearTimeout(timeout);
    };
  }, [navigation, route?.params?.url, route?.params?.timestamp, processSharedUrl]);

  const handleSearch = () => {
    if (query.trim() === '') return;
    handleSearchWithUrl(query);
  };

  const clearAll = () => {
    setQuery('');
    setResults([]);
    navigation.setParams({
      url: undefined,
      timestamp: undefined,
      forceUpdate: false,
      forceReload: false,
    });
    lastProcessedUrl.current = null;
  };

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const trimmed = (text || '').trim();
      if (!trimmed) {
        Alert.alert(t.notice || t.error, t.importClipboardEmpty || '클립보드가 비어 있습니다.');
        return;
      }
      setQuery(trimmed);
      if (/(youtube\.com|youtu\.be)/i.test(trimmed)) {
        setTimeout(() => handleSearchWithUrl(trimmed), 50);
      } else {
        textInputRef.current?.focus();
      }
    } catch (e) {
      console.warn('[ImportScreen] clipboard', e);
      Alert.alert(t.error, t.importClipboardError || '클립보드를 읽을 수 없습니다.');
    }
  }, [handleSearchWithUrl, t]);

  const openVideoApp = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        const canOpen = await Linking.canOpenURL('youtube://');
        if (canOpen) await Linking.openURL('youtube://');
        else await Linking.openURL('https://www.youtube.com');
      } else {
        const intentUrl =
          'intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end';
        try {
          await Linking.openURL(intentUrl);
        } catch {
          await Linking.openURL('https://www.youtube.com');
        }
      }
    } catch {
      try {
        await Linking.openURL('https://www.youtube.com');
      } catch {
        Alert.alert(t.error, t.cannotOpenVideo);
      }
    }
  }, [t]);

  const openVideoInYoutubeApp = useCallback(async (item) => {
    const videoUrl = item.url || `https://www.youtube.com/watch?v=${item.id}`;
    if (!videoUrl) {
      Alert.alert(t.error, t.videoUrlNotFound);
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const videoId = videoUrl.match(/[?&]v=([^&]+)/)?.[1];
        if (videoId) {
          const appUrl = `vnd.youtube:${videoId}`;
          try {
            if (await Linking.canOpenURL(appUrl)) {
              await Linking.openURL(appUrl);
              return;
            }
          } catch {
            /* fall through */
          }
        }
      } else if (Platform.OS === 'ios') {
        const videoId = videoUrl.match(/[?&]v=([^&]+)/)?.[1];
        if (videoId) {
          const appUrl = `youtube://watch?v=${videoId}`;
          try {
            if (await Linking.canOpenURL(appUrl)) {
              await Linking.openURL(appUrl);
              return;
            }
          } catch {
            /* fall through */
          }
        }
      }
      await Linking.openURL(videoUrl);
    } catch (e) {
      console.error('[ImportScreen] openVideoInYoutubeApp', e);
      Alert.alert(t.error, t.cannotOpenVideo);
    }
  }, [t]);

  const handleViewDetails = (item) => {
    const videoUrl = item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.url || '';
    openLinkDownWithFlag(videoUrl);
  };

  const handleAddFavorite = async (item) => {
    try {
      const isFav = favorites.has(item.id);
      if (isFav) {
        await removeFavorite(item.id);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else {
        await addFavorite({
          id: item.id,
          title: item.title,
          url: item.url,
          thumbnail: item.thumbnail,
          author: item.author,
          authorUrl: item.authorUrl || '',
        });
        setFavorites((prev) => new Set(prev).add(item.id));
      }
    } catch (e) {
      console.error('[ImportScreen] favorite', e);
      Alert.alert(t.error, t.favoriteSaveError);
    }
  };

  const handleRemoveResult = (item) => {
    setResults((prev) => prev.filter((r) => r.id !== item.id));
  };

  const renderVideoItem = ({ item }) => {
    const isFav = favorites.has(item.id);
    return (
      <TouchableOpacity
        style={styles.videoItem}
        onPress={() => openVideoInYoutubeApp(item)}
        activeOpacity={0.8}
      >
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.videoThumbnail, styles.videoThumbnailPlaceholder]}>
            <Ionicons name="videocam" size={48} color="#999" />
          </View>
        )}
        <View style={styles.videoContent}>
          <TouchableOpacity
            style={styles.removeResultButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRemoveResult(item);
            }}
          >
            <Ionicons name="close-circle" size={24} color="#999" />
          </TouchableOpacity>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title || 'Video'}
          </Text>
          {!!item.author && (
            <Text style={styles.videoChannel} numberOfLines={1}>
              {item.author}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAddFavorite(item);
              }}
            >
              <Ionicons
                name={isFav ? 'star' : 'star-outline'}
                size={18}
                color={isFav ? '#FFD700' : '#999'}
              />
              <Text style={styles.buttonText}>{t.addToFavorites}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.playButton}
              onPress={(e) => {
                e.stopPropagation();
                openVideoInYoutubeApp(item);
              }}
            >
              <Ionicons name="play-circle" size={18} color="#fff" />
              <Text style={styles.playButtonText}>{t.play}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={(e) => {
                e.stopPropagation();
                handleViewDetails(item);
              }}
            >
              <Ionicons name="open-outline" size={18} color="#fff" />
              <Text style={styles.detailsButtonText}>{t.viewDetails}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listEmpty = (
    <View style={styles.emptyStateWrapper}>
      <View style={styles.emptyStateHeader}>
        <TouchableOpacity onPress={openVideoApp} activeOpacity={0.7}>
          <Animated.View style={[styles.videoIconButton, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.iconHintText}>{t.getVideoHint}</Text>
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{t.shareFromVideoApp}</Text>
          <Ionicons name="arrow-redo-outline" size={18} color="#333" style={styles.emptyRowIcon} />
        </View>
        <TouchableOpacity onPress={handlePasteFromClipboard} activeOpacity={0.7}>
          <View style={styles.emptyRow}>
            <Text style={styles.emptySubText}>{t.importTapToPasteHint || t.orCopyVideoUrl}</Text>
            <Ionicons name="copy-outline" size={16} color="#666" style={styles.emptyRowIconSm} />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.emptyStateSpacer} />
      <InlineNativeAd flushHorizontal />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF0000" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => navigation.navigate('MusicRecognition')}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t.appTitle}</Text>
          </View>
          <LanguageSelector />
        </View>
      </SafeAreaView>

      <View style={styles.searchSection}>
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handlePasteFromClipboard}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            style={styles.linkIconButton}
            accessibilityRole="button"
            accessibilityLabel={t.importLinkIconPasteHint || t.importTapToPasteHint || '클립보드에서 URL 붙여넣기'}
          >
            <Ionicons name="link" size={20} color="#999" />
          </TouchableOpacity>
          <TextInput
            ref={textInputRef}
            style={styles.searchInput}
            placeholder={t.videoUrlPlaceholder}
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
            scrollEnabled={false}
            selectTextOnFocus
            onFocus={() => {
              if (query && textInputRef.current) {
                setTimeout(() => {
                  textInputRef.current?.setNativeProps({
                    selection: { start: 0, end: query.length },
                  });
                }, 50);
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchButtonText}>{t.getVideo}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={styles.loadingText}>{t.loadingVideoInfo}</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderVideoItem}
            keyExtractor={(item, index) => `import-${item.id || index}`}
            removeClippedSubviews={false}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={results.length > 0 ? <InlineNativeAd style={{ marginTop: 20 }} /> : null}
            contentContainerStyle={results.length === 0 ? styles.listContentEmpty : styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    backgroundColor: '#FF0000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF0000',
    borderBottomWidth: 1,
    borderBottomColor: '#cc0000',
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 44,
    height: 44,
    resizeMode: 'cover',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  linkIconButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 48,
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: 0,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchButton: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FF0000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  /** 결과 없을 때: 안내는 위쪽, 네이티브 광고는 아래쪽 (검색 빈 화면과 동일 패턴) */
  emptyStateWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 360,
  },
  emptyStateHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 40,
  },
  emptyStateSpacer: {
    flex: 1,
    minHeight: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 0,
    textAlign: 'center',
  },
  videoIconButton: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 160,
    maxWidth: 200,
  },
  iconHintText: {
    fontSize: 16,
    color: '#FF0000',
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 8,
    lineHeight: 24,
  },
  emptySubText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
    fontWeight: '400',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRowIcon: {
    marginLeft: 6,
  },
  emptyRowIconSm: {
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  videoItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#ddd',
  },
  videoThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContent: {
    padding: 16,
    position: 'relative',
  },
  removeResultButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
    paddingRight: 32,
  },
  videoChannel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  /* MusicRecognitionScreen과 동일: 재생 #2196F3, 자세히 #FF0000 */
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
});
