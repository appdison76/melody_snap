import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeMediaView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';

/** AdMob 네이티브 광고 — 가져오기 목록 푸터, 음악 찾기 인식 직후 등 */
const NATIVE_AD_UNIT_ID = 'ca-app-pub-2041836899811349/4052796815';

function iconUri(icon) {
  if (!icon) return null;
  return icon.url || icon.uri;
}

/**
 * @param {object} props
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.style]
 * @param {boolean} [props.flushHorizontal] — true면 좌우 추가 마진 없음 (ScrollView 등 이미 padding 있는 영역)
 */
export default function InlineNativeAd({ style, flushHorizontal = false }) {
  const [nativeAd, setNativeAd] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let adInstance = null;

    NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        adInstance = ad;
        setNativeAd(ad);
      })
      .catch((err) => {
        console.warn('[InlineNativeAd] failed to load', err);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (adInstance) {
        adInstance.destroy();
      }
    };
  }, []);

  if (failed || !nativeAd) {
    return null;
  }

  const iconSource = iconUri(nativeAd.icon);

  return (
    <View style={[flushHorizontal ? styles.outerFlush : styles.outerInset, style]}>
      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        <Text style={styles.adLabel}>광고</Text>

        <View style={styles.topRow}>
          {iconSource ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: iconSource }} style={styles.icon} />
            </NativeAsset>
          ) : null}

          <View style={styles.textColumn}>
            {nativeAd.headline ? (
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.headline} numberOfLines={2}>
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
            ) : null}
            {nativeAd.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.body} numberOfLines={3}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            ) : null}
          </View>
        </View>

        <NativeMediaView style={styles.media} resizeMode="cover" />

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta}>{nativeAd.callToAction}</Text>
          </NativeAsset>
        ) : null}
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  /** ImportScreen FlatList: list padding + 카드와 동일 리듬 */
  outerInset: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    backgroundColor: 'transparent',
  },
  /** ScrollView 등 이미 좌우 padding 있는 영역 — 인식 카드와 같은 폭 */
  outerFlush: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  media: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 12,
    minHeight: 180,
    maxHeight: 240,
    backgroundColor: '#eaeaea',
    borderRadius: 8,
  },
  cta: {
    marginTop: 10,
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#FF0000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
