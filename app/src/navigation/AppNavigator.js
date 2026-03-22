import React from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import FavoritesScreen from '../screens/FavoritesScreen';
import VideoSearchScreen from '../screens/VideoSearchScreen';
import ImportScreen from '../screens/ImportScreen';
import MusicRecognitionScreen from '../screens/MusicRecognitionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../locales/translations';
import { extractYoutubeUrlFromShare, normalizeYoutubeNavigationUrl } from '../utils/youtubeShare';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage] || translations.ko || {};
  
  const getTabTitle = (routeName) => {
    switch (routeName) {
      case 'VideoSearch':
        return t.tabSearch;
      case 'Import':
        return t.tabImport;
      case 'Favorites':
        return t.tabFavorites;
      case 'MusicRecognition':
        return t.tabMusicRecognition;
      default:
        return '';
    }
  };
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'VideoSearch') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Import') {
            iconName = focused ? 'link' : 'link-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'MusicRecognition') {
            iconName = focused ? 'musical-notes' : 'musical-notes-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabel: getTabTitle(route.name),
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: '#999',
        headerShown: false, // 커스텀 헤더 사용
      })}
    >
      <Tab.Screen 
        name="MusicRecognition" 
        component={MusicRecognitionScreen}
      />
      <Tab.Screen 
        name="VideoSearch" 
        component={VideoSearchScreen}
      />
      <Tab.Screen 
        name="Import" 
        component={ImportScreen}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialUrl }) {
  const navigationRef = React.useRef();
  const [isReady, setIsReady] = React.useState(false);
  const lastProcessedUrl = React.useRef(null);
  const lastTimestamp = React.useRef(null);

  React.useEffect(() => {
    if (isReady && initialUrl) {
      // URL과 타임스탬프 추출
      const urlParts = initialUrl.split('?t=');
      const urlWithoutTimestamp = urlParts[0];
      const timestamp = urlParts[1] ? parseInt(urlParts[1]) : null;
      
      // 타임스탬프가 다르면 무조건 업데이트 (새로운 공유)
      const isNewShare = timestamp !== null && lastTimestamp.current !== timestamp;
      
      // 같은 URL이고 타임스탬프도 같으면 스킵 (단, 새로운 공유는 제외)
      if (!isNewShare && lastProcessedUrl.current === urlWithoutTimestamp && lastTimestamp.current === timestamp) {
        console.log('[AppNavigator] Same URL and timestamp, skipping:', urlWithoutTimestamp);
        return;
      }
      
      // 새 URL이면 이전 값 업데이트
      lastProcessedUrl.current = urlWithoutTimestamp;
      lastTimestamp.current = timestamp;
      try {
        console.log('[AppNavigator] Processing initialUrl:', initialUrl);

        let urlToNavigate = null;

        // initialUrl이 문자열인 경우
        if (typeof initialUrl === 'string') {
          urlToNavigate = initialUrl;
        }
        // initialUrl이 객체인 경우 (expo-linking에서 받은 경우)
        else if (initialUrl && initialUrl.url) {
          urlToNavigate = initialUrl.url;
        }

        if (urlToNavigate) {
          console.log('[AppNavigator] Navigating to Import with URL:', urlToNavigate);
          urlToNavigate = (extractYoutubeUrlFromShare(urlToNavigate.trim()) || urlToNavigate.trim());
          urlToNavigate = normalizeYoutubeNavigationUrl(urlToNavigate);
          console.log('[AppNavigator] Normalized Import URL:', urlToNavigate);

          if (!urlToNavigate) {
            console.log('[AppNavigator] No URL after normalize/extract');
          } else {
            const newTimestamp = Date.now();
            const newParams = { url: urlToNavigate, timestamp: newTimestamp, forceUpdate: true };
            navigationRef.current?.dispatch(
              CommonActions.navigate({
                name: 'Main',
                params: {
                  screen: 'Import',
                  params: newParams,
                },
              })
            );
          }
        } else {
          console.log('[AppNavigator] No valid URL found in:', initialUrl);
        }
      } catch (error) {
        console.error('[AppNavigator] Deep linking navigation error:', error);
      }
    }
  }, [isReady, initialUrl]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setIsReady(true)}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={MainTabs}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
