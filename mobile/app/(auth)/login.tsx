import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api, DEFAULT_API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Profile } from '../../types';
import {
  User,
  Phone,
  CheckCircle2,
  UserPlus,
  Settings,
  RefreshCw,
  Server,
  Check,
  AlertCircle,
  X,
  Wifi,
} from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<'profiles' | 'phone'>('profiles');
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Server Settings Modal State
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(api.getBaseUrl());
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    setLoadError(null);
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (e: any) {
      console.warn('Load accounts error:', e);
      setLoadError(e.message || 'Không thể kết nối đến máy chủ API.');
    } finally {
      setLoadingAccounts(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccounts();
  }, []);

  const handleSelectAccount = async (account: Profile) => {
    setSubmitting(true);
    try {
      await login({ user_id: account.id });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'Đăng nhập thất bại',
        `${e.message || 'Không thể đăng nhập vào hồ sơ này.'}\n\nHãy kiểm tra xem máy chủ backend đang chạy và điện thoại cùng mạng Wi-Fi.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 6) {
      Alert.alert('Lưu ý', 'Vui lòng nhập số điện thoại hoặc mã người dùng hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ phone: phoneNumber.trim() });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'Đăng nhập thất bại',
        `${e.message || 'Số điện thoại hoặc thông tin không chính xác.'}\n\nHãy kiểm tra xem máy chủ backend đang chạy và điện thoại cùng mạng Wi-Fi.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSettings = () => {
    setServerUrlInput(api.getBaseUrl());
    setTestResult(null);
    setSettingsVisible(true);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(serverUrlInput.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kiểm tra kết nối' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async () => {
    const clean = serverUrlInput.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      Alert.alert('Lỗi định dạng', 'Địa chỉ máy chủ phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    await api.setBaseUrl(clean);
    setSettingsVisible(false);
    loadAccounts();
  };

  const handleResetDefaultUrl = () => {
    setServerUrlInput(DEFAULT_API_URL);
    setTestResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Top bar with Server Settings Icon */}
        <View style={styles.topBar}>
          <View style={styles.networkStatusPill}>
            <Wifi size={13} color={loadError ? Colors.highText : Colors.primaryDark} />
            <Text
              style={[
                styles.networkStatusText,
                loadError && { color: Colors.highText },
              ]}
              numberOfLines={1}
            >
              {api.getBaseUrl().replace('http://', '').replace('https://', '')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={handleOpenSettings}
            activeOpacity={0.7}
            accessibilityLabel="Cài đặt máy chủ"
          >
            <Settings size={22} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.crossIcon}>✚</Text>
          </View>
          <Text style={styles.title}>Đăng Nhập MediRead AI</Text>
          <Text style={styles.subtitle}>Chọn hồ sơ có sẵn trên hệ thống hoặc đăng nhập bằng SĐT</Text>
        </View>

        {/* Connection Error Banner (if any) */}
        {loadError && (
          <View style={styles.errorBanner}>
            <View style={styles.errorHeaderRow}>
              <AlertCircle size={20} color={Colors.highText} />
              <Text style={styles.errorTitle}>Chưa kết nối được máy chủ backend</Text>
            </View>
            <Text style={styles.errorDetail}>
              Địa chỉ hiện tại: <Text style={styles.monoText}>{api.getBaseUrl()}</Text>
            </Text>
            <Text style={styles.errorHint}>
              • Đảm bảo máy tính và điện thoại kết nối cùng mạng Wi-Fi.{'\n'}
              • Đảm bảo backend FastAPI đang chạy trên cổng 8000.
            </Text>
            <View style={styles.errorBtnRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadAccounts}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Thử Lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeIpBtn}
                onPress={handleOpenSettings}
                activeOpacity={0.8}
              >
                <Settings size={15} color={Colors.primaryDark} />
                <Text style={styles.changeIpBtnText}>Đổi IP Máy Chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'profiles' && styles.tabBtnActive]}
            onPress={() => setTab('profiles')}
            activeOpacity={0.8}
          >
            <User size={16} color={tab === 'profiles' ? '#FFFFFF' : Colors.primaryDark} />
            <Text style={[styles.tabText, tab === 'profiles' && styles.tabTextActive]}>
              Chọn Hồ Sơ Nhanh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'phone' && styles.tabBtnActive]}
            onPress={() => setTab('phone')}
            activeOpacity={0.8}
          >
            <Phone size={16} color={tab === 'phone' ? '#FFFFFF' : Colors.primaryDark} />
            <Text style={[styles.tabText, tab === 'phone' && styles.tabTextActive]}>
              Số Điện Thoại
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Profiles List */}
        {tab === 'profiles' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Hồ sơ người dùng trên hệ thống:</Text>
              <TouchableOpacity onPress={loadAccounts} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <RefreshCw size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingAccounts ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Đang tải danh sách hồ sơ từ máy chủ...</Text>
              </View>
            ) : accounts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {loadError
                    ? 'Không lấy được danh sách do lỗi kết nối. Hãy bấm "Thử Lại" hoặc kiểm tra IP máy chủ.'
                    : 'Chưa có hồ sơ nào trên hệ thống. Bạn có thể đăng ký tài khoản mới bên dưới.'}
                </Text>
                <TouchableOpacity style={styles.emptyRetryBtn} onPress={loadAccounts}>
                  <RefreshCw size={16} color={Colors.primary} />
                  <Text style={styles.emptyRetryText}>Tải lại danh sách</Text>
                </TouchableOpacity>
              </View>
            ) : (
              accounts.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.accountCard}
                  onPress={() => handleSelectAccount(item)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.full_name ? item.full_name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>

                  <View style={styles.accountInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.accountName}>{item.full_name}</Text>
                      <View
                        style={[
                          styles.roleBadge,
                          item.role === 'caregiver' ? styles.roleCaregiver : styles.rolePatient,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            item.role === 'caregiver' ? styles.roleTextCaregiver : styles.roleTextPatient,
                          ]}
                        >
                          {item.role === 'caregiver' ? 'Người chăm sóc' : 'Bệnh nhân'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.accountDetail}>
                      {item.birth_year ? `Năm sinh: ${item.birth_year}` : 'Hồ sơ đã xác thực'} •{' '}
                      {item.sex === 'nu' ? 'Nữ' : 'Nam'}
                    </Text>
                  </View>

                  <CheckCircle2 size={20} color={Colors.primary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Tab 2: Phone Input */}
        {tab === 'phone' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Nhập số điện thoại đã đăng ký:</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={Colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 0912345678"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handlePhoneLogin}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Đăng Nhập Ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Register CTA */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/(auth)/register' as any)}
          activeOpacity={0.7}
        >
          <UserPlus size={18} color={Colors.primary} />
          <Text style={styles.registerText}>
            Chưa có tài khoản? <Text style={styles.registerHighlight}>Đăng ký mới</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Server Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Server size={22} color={Colors.primary} />
                <Text style={styles.modalTitle}>Cài Đặt Máy Chủ API</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSettingsVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Nhập địa chỉ IP mạng LAN của máy tính đang chạy backend FastAPI (cổng 8000).
            </Text>

            <View style={styles.urlInputBox}>
              <TextInput
                style={styles.urlInput}
                value={serverUrlInput}
                onChangeText={(val) => {
                  setServerUrlInput(val);
                  setTestResult(null);
                }}
                placeholder="http://10.161.30.195:8000"
                placeholderTextColor={Colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={testingConnection}
              activeOpacity={0.8}
            >
              {testingConnection ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Wifi size={16} color={Colors.primary} />
                  <Text style={styles.testBtnText}>Kiểm tra kết nối thử</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Test Result Message */}
            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.success ? styles.testResultSuccess : styles.testResultError,
                ]}
              >
                {testResult.success ? (
                  <Check size={18} color={Colors.normalText} />
                ) : (
                  <AlertCircle size={18} color={Colors.highText} />
                )}
                <Text
                  style={[
                    styles.testResultText,
                    testResult.success ? { color: Colors.normalText } : { color: Colors.highText },
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={handleResetDefaultUrl}
              >
                <Text style={styles.presetPillText}>IP Mặc định ({DEFAULT_API_URL.replace('http://', '')})</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSettingsVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>Lưu & Kết Nối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  networkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '75%',
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  crossIcon: {
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: Colors.highBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: Colors.highBorder,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.highText,
  },
  errorDetail: {
    fontSize: 13,
    color: Colors.highText,
    marginBottom: 6,
  },
  monoText: {
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  errorHint: {
    fontSize: 12,
    color: '#7A2222',
    lineHeight: 18,
    marginBottom: 12,
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  changeIpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    borderRadius: 12,
  },
  changeIpBtnText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: Colors.primaryDark,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyRetryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  accountInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    flex: 1,
  },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rolePatient: {
    backgroundColor: Colors.normalBg,
  },
  roleCaregiver: {
    backgroundColor: Colors.lowBg,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleTextPatient: {
    color: Colors.normalText,
  },
  roleTextCaregiver: {
    color: Colors.lowText,
  },
  accountDetail: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMain,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  registerText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  registerHighlight: {
    color: Colors.primary,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  urlInputBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
  },
  urlInput: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMain,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  testResultSuccess: {
    backgroundColor: Colors.normalBg,
    borderWidth: 1,
    borderColor: Colors.normalBorder,
  },
  testResultError: {
    backgroundColor: Colors.highBg,
    borderWidth: 1,
    borderColor: Colors.highBorder,
  },
  testResultText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  presetRow: {
    marginBottom: 18,
  },
  presetPill: {
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetPillText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
