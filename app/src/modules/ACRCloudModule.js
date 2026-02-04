// ACRCloud 모듈 래퍼
import { Platform } from 'react-native';

let ACRCloudModule = null;

if (Platform.OS === 'android') {
  try {
    ACRCloudModule = require('expo-acrcloud-module').default;
  } catch (e1) {
    try {
      // Metro가 패키지 이름으로 못 찾을 때 상대 경로로 시도 (melody_snap/app/src/modules → packages)
      ACRCloudModule = require('../../../packages/expo-acrcloud-module').default;
    } catch (e2) {
      console.warn('[ACRCloudModule] Native module failed to load:', e1?.message || e1);
      console.warn('[ACRCloudModule] Full error:', e1);
      // 모듈이 없을 때를 위한 더미 구현
      ACRCloudModule = {
        initialize: async () => {
          console.warn('[ACRCloudModule] Module not initialized. Please install ACRCloud SDK.');
          return false;
        },
        startRecognizing: async () => {
          console.warn('[ACRCloudModule] Module not initialized.');
          return false;
        },
        stopRecognizing: async () => {
          console.warn('[ACRCloudModule] Module not initialized.');
          return false;
        },
        isRecognizing: () => false,
        isInitialized: () => false,
      };
    }
  }
} else {
  // iOS는 아직 지원하지 않음
  ACRCloudModule = {
    initialize: async () => {
      console.warn('[ACRCloudModule] iOS is not supported yet.');
      return false;
    },
    startRecognizing: async () => {
      console.warn('[ACRCloudModule] iOS is not supported yet.');
      return false;
    },
    stopRecognizing: async () => {
      console.warn('[ACRCloudModule] iOS is not supported yet.');
      return false;
    },
    isRecognizing: () => false,
    isInitialized: () => false,
  };
}

export default ACRCloudModule;
