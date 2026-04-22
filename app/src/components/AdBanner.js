import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const BANNER_UNIT_ID = 'ca-app-pub-2041836899811349/9078755840';

export default function AdBanner({ style }) {
  const [adFailed, setAdFailed] = useState(false);

  if (adFailed) {
    return null;
  }

  return (
    <View style={[styles.container, styles.admobContainer, style]}>
      <View style={styles.admobWrapper}>
        <BannerAd
          unitId={BANNER_UNIT_ID}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          style={styles.admobBannerStyle}
          onAdLoaded={() => {
            console.log('[AdBanner] AdMob banner ad loaded');
          }}
          onAdFailedToLoad={(error) => {
            const isNoFill = error?.code === 'error-code-no-fill' || String(error?.message || '').includes('no-fill');
            if (isNoFill) {
              if (__DEV__) console.log('[AdBanner] AdMob no-fill, hiding banner area');
              setAdFailed(true);
              return;
            }
            console.error('[AdBanner] AdMob banner ad failed to load:', error);
            setAdFailed(true);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 180,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  admobContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: '#fff',
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'visible',
  },
  admobWrapper: {
    width: 320,
    height: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    borderRadius: 0,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  admobBannerStyle: {
    backgroundColor: '#fff',
    width: 320,
    height: 50,
    alignSelf: 'center',
  },
});
