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
import { ArrowLeft, User, Calendar, Phone, Shield, Lock } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('1960');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sex, setSex] = useState<'nam' | 'nu'>('nam');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName || fullName.trim().length < 2) {
      Alert.alert('Lưu ý', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }

    if (!phoneNumber || phoneNumber.replace(/\s+/g, '').length < 6) {
      Alert.alert('Lưu ý', 'Vui lòng nhập số điện thoại hợp lệ (tối thiểu 6 số) để dùng khi đăng nhập.');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Lưu ý', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lưu ý', 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        birth_year: parseInt(birthYear, 10) || 1960,
        phone: phoneNumber.trim(),
        password,
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.primaryDark} />
          <Text style={styles.backText} allowFontScaling={false}>Quay lại</Text>
        </TouchableOpacity>

        <Text style={styles.title} allowFontScaling={false}>Tạo Hồ Sơ Mới</Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          Điền thông tin để MediRead AI điều chỉnh cỡ chữ & lời giải thích phù hợp độ tuổi
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label} allowFontScaling={false}>Họ và tên *</Text>
          <View style={styles.inputWrapper}>
            <User size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Bác Nguyễn Văn An"
              placeholderTextColor={Colors.textSubtle}
              value={fullName}
              onChangeText={setFullName}
              allowFontScaling={false}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label} allowFontScaling={false}>Năm sinh</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="1960"
                keyboardType="numeric"
                maxLength={4}
                value={birthYear}
                onChangeText={setBirthYear}
                allowFontScaling={false}
              />
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label} allowFontScaling={false}>Giới tính</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, sex === 'nam' && styles.genderBtnActive]}
                onPress={() => setSex('nam')}
              >
                <Text style={[styles.genderText, sex === 'nam' && styles.genderTextActive]} allowFontScaling={false}>
                  Nam
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, sex === 'nu' && styles.genderBtnActive]}
                onPress={() => setSex('nu')}
              >
                <Text style={[styles.genderText, sex === 'nu' && styles.genderTextActive]} allowFontScaling={false}>
                  Nữ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label} allowFontScaling={false}>Vai trò sử dụng</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'patient' && styles.roleCardActive]}
              onPress={() => setRole('patient')}
            >
              <Text style={styles.roleEmoji} allowFontScaling={false}>👴</Text>
              <Text style={[styles.roleTitle, role === 'patient' && styles.roleTitleActive]} allowFontScaling={false}>
                Người Bệnh
              </Text>
              <Text style={styles.roleDesc} allowFontScaling={false}>
                Cần chữ to, giải thích đơn giản và đọc to bằng giọng nói
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'caregiver' && styles.roleCardActive]}
              onPress={() => setRole('caregiver')}
            >
              <Text style={styles.roleEmoji} allowFontScaling={false}>🤝</Text>
              <Text style={[styles.roleTitle, role === 'caregiver' && styles.roleTitleActive]} allowFontScaling={false}>
                Người Chăm Sóc
              </Text>
              <Text style={styles.roleDesc} allowFontScaling={false}>
                Theo dõi đơn thuốc và chỉ số cho người thân trong gia đình
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label} allowFontScaling={false}>Số điện thoại đăng nhập *</Text>
          <View style={styles.inputWrapper}>
            <Phone size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="0912 345 678"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              allowFontScaling={false}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label} allowFontScaling={false}>Mật khẩu *</Text>
          <View style={styles.inputWrapper}>
            <Shield size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor={Colors.textSubtle}
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
              allowFontScaling={false}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label} allowFontScaling={false}>Xác nhận mật khẩu *</Text>
          <View style={styles.inputWrapper}>
            <Shield size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor={Colors.textSubtle}
              secureTextEntry={true}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              allowFontScaling={false}
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
            <Text style={styles.submitBtnText} allowFontScaling={false}>
              Hoàn Tất Đăng Ký
            </Text>
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
    padding: 18,
    paddingBottom: 36,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMain,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    height: 46,
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
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  roleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 3,
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
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
