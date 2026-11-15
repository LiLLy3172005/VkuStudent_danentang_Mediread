import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Profile } from '../../types';
import { User, Phone, CheckCircle2, UserPlus } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<'profiles' | 'phone'>('profiles');
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (e: any) {
      console.warn('Load accounts error:', e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSelectAccount = async (account: Profile) => {
    setSubmitting(true);
    try {
      await login({ user_id: account.id });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.message || 'Không thể đăng nhập vào hồ sơ này.');
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
      Alert.alert('Đăng nhập thất bại', e.message || 'Số điện thoại hoặc thông tin không chính xác.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.crossIcon}>✚</Text>
          </View>
          <Text style={styles.title}>Đăng Nhập MediRead AI</Text>
          <Text style={styles.subtitle}>Chọn hồ sơ có sẵn trên hệ thống hoặc đăng nhập bằng SĐT</Text>
        </View>

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
            <Text style={styles.sectionLabel}>Hồ sơ bệnh nhân / người chăm sóc trên Supabase:</Text>

            {loadingAccounts ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : accounts.length === 0 ? (
              <Text style={styles.emptyText}>Chưa tìm thấy hồ sơ nào. Bạn có thể đăng ký tài khoản mới.</Text>
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
                      {item.birth_year ? `Năm sinh: ${item.birth_year}` : 'Hồ sơ đã xác thực'} • {item.sex === 'nu' ? 'Nữ' : 'Nam'}
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
          <Text style={styles.registerText}>Chưa có tài khoản? <Text style={styles.registerHighlight}>Đăng ký mới</Text></Text>
        </TouchableOpacity>
      </ScrollView>
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
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 4,
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
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: 16,
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
});
