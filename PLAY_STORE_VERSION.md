# MelodySnap — Play 스토어 배포용

이 레포는 **Google Play 스토어 출시용** 버전입니다.

## 앱 기능 (탭 3개만)
- **음악 찾기** — 음악 인식
- **검색** — YouTube 검색
- **찜하기** — 즐겨찾기

## 제외된 기능
- **저장** 탭 (URL 붙여넣기 / 다운로드) — 제거됨
- **내 파일** 탭 — 제거됨

다운로드 관련 버튼을 누르면 "Play 스토어 버전에서는 다운로드 기능을 제공하지 않습니다" 안내가 표시됩니다.

## ACRCloud 음악 인식 (.so 라이브러리)

음악 인식이 동작하려면 ACRCloud 네이티브 라이브러리가 필요합니다. **저장소에는 `.so` 파일이 포함되지 않습니다** (`.gitignore`).

- **youtube_down에서 이미 .so를 넣어 둔 경우**  
  아래 폴더의 `libACRCloudUniversalEngine.so`를 melody_snap의 같은 경로로 복사하세요.  
  - `youtube_down/app/packages/expo-acrcloud-module/android/src/main/jniLibs/arm64-v8a/`  
  - `youtube_down/app/packages/expo-acrcloud-module/android/src/main/jniLibs/armeabi-v7a/`  
  - `youtube_down/app/packages/expo-acrcloud-module/android/src/main/jniLibs/x86/`  
  - `youtube_down/app/packages/expo-acrcloud-module/android/src/main/jniLibs/x86_64/`  
  → 각각 `melody_snap/app/packages/expo-acrcloud-module/android/src/main/jniLibs/...` 동일 폴더로.

- **처음 설정하는 경우**  
  `app/packages/expo-acrcloud-module/SDK_SETUP.md` 참고.  
  ACRCloud SDK(https://github.com/acrcloud/ACRCloudUniversalSDK)에서 `libACRCloudUniversalEngine.so`를 받아 위와 같은 `jniLibs` 폴더들에 넣으면 됩니다.

복사 후 **클린 빌드** 권장:  
`cd app` → `npx expo run:android` 또는 `android` 폴더에서 `.\gradlew clean` 후 `npx expo run:android`.

## 빌드
```bash
cd app
npm install
npx expo run:android
```

## 원본
- 소스 기준: youtube_down 복사 후 위 기능만 제거·수정
- 백엔드: server/ 그대로 사용 (검색, 자동완성, 음악 인식 API)
