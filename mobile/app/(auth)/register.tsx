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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, User, Calendar, Phone, Shield } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('1960');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sex, setSex] = useState<'nam' | 'nu'>('nam');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName || fullName.trim().length < 2) {
      Alert.alert('Lưu ý', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        birth_year: parseInt(birthYear, 10) || 1960,
        phone: phoneNumber.trim() || undefined,
        sex,
        role,
      });
      Alert.alert('Thành công', 'Đăng ký hồ sơ thành công!', [
        { text: 'Tiếp tục', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi đăng ký', e.message || 'Không thể tạo tài khoản lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.primaryDark} />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Tạo Hồ Sơ Mới</Text>
        <Text style={styles.subtitle}>Điền thông tin để MediRead AI điều chỉnh cỡ chữ & lời giải thích phù hợp độ tuổi</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Họ và tên *</Text>
          <View style={styles.inputWrapper}>
            <User size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Bác Nguyễn Văn An"
              placeholderTextColor={Colors.textSubtle}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Năm sinh</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="1960"
                keyboardType="numeric"
                maxLength={4}
                value={birthYear}
                onChangeText={setBirthYear}
              />
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, sex === 'nam' && styles.genderBtnActive]}
                onPress={() => setSex('nam')}
              >
                <Text style={[styles.genderText, sex === 'nam' && styles.genderTextActive]}>Nam</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, sex === 'nu' && styles.genderBtnActive]}
                onPress={() => setSex('nu')}
              >
                <Text style={[styles.genderText, sex === 'nu' && styles.genderTextActive]}>Nữ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Vai trò sử dụng</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'patient' && styles.roleCardActive]}
              onPress={() => setRole('patient')}
            >
              <Text style={styles.roleEmoji}>👴</Text>
              <Text style={[styles.roleTitle, role === 'patient' && styles.roleTitleActive]}>Người Bệnh</Text>
              <Text style={styles.roleDesc}>Cần chữ to, giải thích đơn giản và đọc to bằng giọng nói</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'caregiver' && styles.roleCardActive]}
              onPress={() => setRole('caregiver')}
            >
              <Text style={styles.roleEmoji}>🤝</Text>
              <Text style={[styles.roleTitle, role === 'caregiver' && styles.roleTitleActive]}>Người Chăm Sóc</Text>
              <Text style={styles.roleDesc}>Theo dõi đơn thuốc và chỉ số cho người thân trong gia đình</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Số điện thoại (tùy chọn)</Text>
          <View style={styles.inputWrapper}>
            <Phone size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="0912 345 678"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleRegister}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Hoàn Tất Đăng Ký</Text>
          )}
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMain,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  roleTitleActive: {
    color: Colors.primary,
  },
  roleDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
