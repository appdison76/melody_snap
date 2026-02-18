import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { translations } from '../locales/translations';
import AdBanner from '../components/AdBanner';
import { exportData, pickAndImport } from '../services/exportImportService';

// 설정 화면 전용 언어별 fallback (translations 로드 문제 시 사용)
const SETTINGS_FALLBACK = {
  ko: { appTitle: 'Melody Snap', error: '오류', notice: '알림', ok: '확인', cancel: '취소', exportData: '데이터 내보내기', importData: '데이터 가져오기', exportError: '내보내기에 실패했습니다.', importSuccess: '가져오기가 완료되었습니다.', importError: '가져오기에 실패했습니다.', importInvalidFile: 'Melody Snap 백업 파일이 아닙니다.', importFileHint: '백업 파일(melody_snap_backup.json)을 선택해주세요.', privacyPolicy: '개인정보처리방침', close: '닫기', privacySectionCollect: '수집하는 항목', privacyTextCollect: '본 앱은 회원가입이나 로그인을 요구하지 않으며, 어떠한 개인정보도 직접 수집하거나 저장하지 않습니다.', privacySectionAds: '광고 관련', privacyTextAds: '구글 애드몹(AdMob) 광고 송출을 위해 기기 식별자 및 광고 ID가 활용될 수 있습니다.', privacySectionData: '데이터 보관', privacyTextData: '녹음·음원 인식 결과 등 사용 데이터는 앱 내부 또는 사용자 기기에만 저장됩니다.', privacySectionContact: '문의', privacyTextContact: '서비스 관련 문의는 앱 스토어 또는 개발자에게 연락 주시기 바랍니다.' },
  en: { appTitle: 'Melody Snap', error: 'Error', notice: 'Notice', ok: 'OK', cancel: 'Cancel', exportData: 'Export Data', importData: 'Import Data', exportError: 'Export failed.', importSuccess: 'Import completed.', importError: 'Import failed.', importInvalidFile: 'Not a valid Melody Snap backup file.', importFileHint: 'Select your backup file (melody_snap_backup.json).', privacyPolicy: 'Privacy Policy', close: 'Close', privacySectionCollect: 'Data We Collect', privacyTextCollect: 'This app does not require sign-up or login and does not collect or store any personal information directly.', privacySectionAds: 'Advertising', privacyTextAds: 'Device identifiers and advertising IDs may be used for Google AdMob.', privacySectionData: 'Data Retention', privacyTextData: 'Usage data is stored only within the app or on your device.', privacySectionContact: 'Contact', privacyTextContact: 'For inquiries, please contact us via the app store or the developer.' },
  ja: { appTitle: 'Melody Snap', error: 'エラー', notice: '通知', ok: 'OK', cancel: 'キャンセル', exportData: 'データをエクスポート', importData: 'データをインポート', exportError: 'エクスポートに失敗しました。', importSuccess: 'インポートが完了しました。', importError: 'インポートに失敗しました。', importInvalidFile: 'Melody Snapのバックアップファイルではありません。', importFileHint: 'バックアップファイル(melody_snap_backup.json)を選択してください。', privacyPolicy: 'プライバシーポリシー', close: '閉じる', privacySectionCollect: '収集する項目', privacyTextCollect: '本アプリは個人情報を直接収集・保存しません。', privacySectionAds: '広告について', privacyTextAds: 'Google AdMobのためデバイス識別子等が利用される場合があります。', privacySectionData: 'データの保管', privacyTextData: '利用データはアプリ内または端末内にのみ保存されます。', privacySectionContact: 'お問い合わせ', privacyTextContact: 'お問い合わせはアプリストアまたは開発者まで。' },
  zh: { appTitle: 'Melody Snap', error: '错误', notice: '通知', ok: '确定', cancel: '取消', exportData: '导出数据', importData: '导入数据', exportError: '导出失败。', importSuccess: '导入完成。', importError: '导入失败。', importInvalidFile: '不是有效的 Melody Snap 备份文件。', importFileHint: '请选择备份文件(melody_snap_backup.json)。', privacyPolicy: '隐私政策', close: '关闭', privacySectionCollect: '收集的项目', privacyTextCollect: '本应用不直接收集或存储个人信息。', privacySectionAds: '广告相关', privacyTextAds: '可能使用设备标识符和广告 ID 用于 Google AdMob。', privacySectionData: '数据保存', privacyTextData: '使用数据仅保存在应用内或您的设备上。', privacySectionContact: '联系', privacyTextContact: '请通过应用商店或开发者联系我们。' },
};

function getT(currentLanguage) {
  const lang = currentLanguage && SETTINGS_FALLBACK[currentLanguage] ? currentLanguage : 'ko';
  const fromTranslations = translations[currentLanguage] || translations.ko || {};
  const fallback = SETTINGS_FALLBACK[lang] || SETTINGS_FALLBACK.ko;
  return new Proxy(fallback, {
    get(_, key) {
      const v = fromTranslations[key];
      if (v != null && String(v).trim() !== '' && !String(v).startsWith('?')) return v;
      return fallback[key];
    },
  });
}

export default function SettingsScreen({ navigation }) {
  const { currentLanguage } = useLanguage();
  const t = getT(currentLanguage);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [exportImportLoading, setExportImportLoading] = useState(false);
  const { height: windowHeight } = useWindowDimensions();

  const handleExport = async () => {
    setExportImportLoading(true);
    try {
      const result = await exportData();
      // shareAsync는 공유창을 뒤로가기로 닫아도 resolve하므로, 성공 알림은 띄우지 않음
      if (!result.success && result.error) {
        Alert.alert(t.error ?? '오류', result.error);
      }
    } catch (err) {
      Alert.alert(t.error ?? '오류', (t.exportError ?? '내보내기에 실패했습니다.') + (err?.message ? '\n' + err.message : ''));
    } finally {
      setExportImportLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      t.importData ?? '데이터 가져오기',
      t.importFileHint ?? '백업 파일(melody_snap_backup.json)을 선택해주세요.',
      [
        { text: t.cancel ?? '취소', style: 'cancel' },
        {
          text: t.ok ?? '확인',
          onPress: async () => {
            setExportImportLoading(true);
            try {
              const result = await pickAndImport();
              if (result.canceled) return;
              if (result.success && result.counts) {
                const { pins, favorites } = result.counts;
                const msg = (t.importSuccess ?? '가져오기가 완료되었습니다.').replace('{pins}', pins).replace('{favorites}', favorites);
                Alert.alert(t.notice ?? '알림', msg);
              } else {
                Alert.alert(t.notice ?? '알림', t.importSuccess ?? '가져오기가 완료되었습니다.');
              }
            } catch (err) {
              const msg = err?.message?.includes('Melody Snap') ? (t.importInvalidFile ?? 'Melody Snap 백업 파일이 아닙니다.') : ((t.importError ?? '가져오기에 실패했습니다.') + (err?.message ? '\n' + err.message : ''));
              Alert.alert(t.error ?? '오류', msg);
            } finally {
              setExportImportLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF0000" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => navigation?.navigate('MusicRecognition')}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t.appTitle ?? 'Melody Snap'}</Text>
          </View>
          <LanguageSelector />
        </View>
      </SafeAreaView>
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={handleExport}
          disabled={exportImportLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload-outline" size={22} color="#333" />
          <Text style={styles.menuLabel}>{t.exportData ?? '데이터 내보내기'}</Text>
          {exportImportLoading ? <ActivityIndicator size="small" color="#999" /> : <Ionicons name="chevron-forward" size={20} color="#999" />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={handleImport}
          disabled={exportImportLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={22} color="#333" />
          <Text style={styles.menuLabel}>{t.importData ?? '데이터 가져오기'}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setIsPrivacyModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={22} color="#333" />
          <Text style={styles.menuLabel}>{t.privacyPolicy ?? '개인정보처리방침'}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </ScrollView>
      <AdBanner />

      {/* 개인정보처리방침 Modal */}
      <Modal
        visible={isPrivacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: windowHeight * 0.58 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.privacyPolicy ?? '개인정보처리방침'}</Text>
            </View>
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator
            >
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>{t.privacySectionCollect ?? '수집하는 항목'}</Text>
                <Text style={styles.privacyText}>{t.privacyTextCollect ?? '본 앱은 회원가입이나 로그인을 요구하지 않으며, 어떠한 개인정보도 직접 수집하거나 저장하지 않습니다.'}</Text>
              </View>
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>{t.privacySectionAds ?? '광고 관련'}</Text>
                <Text style={styles.privacyText}>{t.privacyTextAds ?? '구글 애드몹(AdMob) 광고 송출을 위해 기기 식별자 및 광고 ID가 활용될 수 있습니다.'}</Text>
              </View>
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>{t.privacySectionData ?? '데이터 보관'}</Text>
                <Text style={styles.privacyText}>{t.privacyTextData ?? '녹음·음원 인식 결과 등 사용 데이터는 앱 내부 또는 사용자 기기에만 저장됩니다.'}</Text>
              </View>
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>{t.privacySectionContact ?? '문의'}</Text>
                <Text style={styles.privacyText}>{t.privacyTextContact ?? '서비스 관련 문의는 앱 스토어 또는 개발자에게 연락 주시기 바랍니다.'}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsPrivacyModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>{t.close ?? '닫기'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    paddingTop: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  // 개인정보처리방침 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    minHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    minHeight: 180,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 28,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    flexShrink: 0,
  },
  modalCloseButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 14,
    margin: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
