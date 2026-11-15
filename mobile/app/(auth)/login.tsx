import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api, DEFAULT_API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Phone,
  Lock,
  UserPlus,
  Settings,
  Server,
  Check,
  AlertCircle,
  X,
  Wifi,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Server Settings Modal State
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(api.getBaseUrl());
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePhoneLogin = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 6) {
      Alert.alert('Lưu ý', 'Vui lòng nhập số điện thoại hợp lệ (tối thiểu 6 số).');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Lưu ý', 'Vui lòng nhập mật khẩu (tối thiểu 6 ký tự).');
      return;
    }

    setSubmitting(true);
    try {
      await login({ phone: phoneNumber.trim(), password });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'Đăng nhập thất bại',
        `${e.message || 'Số điện thoại hoặc mật khẩu không chính xác.'}\n\nHãy kiểm tra lại thông tin hoặc thử đăng ký tài khoản mới.`
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
    Alert.alert('Thành công', 'Đã lưu địa chỉ máy chủ API.');
  };

  const handleResetDefaultUrl = () => {
    setServerUrlInput(DEFAULT_API_URL);
    setTestResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top bar with Secure Badge & Settings Icon */}
        <View style={styles.topBar}>
          <View style={styles.networkStatusPill}>
            <ShieldCheck size={14} color={Colors.primary} />
            <Text style={styles.networkStatusText}>🔒 Kết nối bảo mật</Text>
          </View>

          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={handleOpenSettings}
            activeOpacity={0.7}
            accessibilityLabel="Cài đặt máy chủ"
          >
            <Settings size={20} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.crossIcon}>✚</Text>
          </View>
          <Text style={styles.title}>Đăng Nhập MediRead AI</Text>
          <Text style={styles.subtitle}>
            Trợ lý đọc hiểu phiếu xét nghiệm & đơn thuốc thông minh cho gia đình
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.formCard}>
          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 0912345678"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.textMuted} />
                ) : (
                  <Eye size={20} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handlePhoneLogin}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Đăng Nhập</Text>
            )}
          </TouchableOpacity>
        </View>

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
              Nhập địa chỉ IP máy chủ backend FastAPI (mặc định cổng 8000).
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
                <Text style={styles.modalSaveText}>Lưu & Áp Dụng</Text>
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
    marginBottom: 16,
  },
  networkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 26,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  crossIcon: {
    fontSize: 36,
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
    paddingHorizontal: 10,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMain,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    marginTop: 26,
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
