const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Node.js polyfills
config.resolver.extraNodeModules = {
  vm: require.resolve('vm-browserify'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  url: require.resolve('url'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  // 로컬 패키지가 node_modules에 없어도 Metro가 찾을 수 있도록
  'expo-acrcloud-module': path.resolve(__dirname, 'packages/expo-acrcloud-module'),
  'expo-media-session-module': path.resolve(__dirname, 'packages/expo-media-session-module'),
  'expo-media-store-module': path.resolve(__dirname, 'packages/expo-media-store-module'),
  'expo-shazam-module': path.resolve(__dirname, 'packages/expo-shazam-module'),
};

module.exports = config;













