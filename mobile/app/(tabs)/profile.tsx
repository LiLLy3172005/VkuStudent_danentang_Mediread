import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { HeaderBar } from '../../components/common/HeaderBar';
import {
  User,
  Users,
  Type,
  Volume2,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { fontScale, setFontScale, ttsRate, setTtsRate, fs } = usePreferences();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bác có chắc chắn muốn đăng xuất tài khoản này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Tài Khoản & Cài Đặt" subtitle="Tùy chỉnh hỗ trợ thị lực và giọng đọc" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText} fixedSize>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <Text style={styles.userName}>
            {user?.full_name || 'Người dùng MediRead'}
          </Text>
          <Text style={styles.userRole}>
            {user?.role === 'caregiver' ? '🤝 Người chăm sóc gia đình' : '👴 Bệnh nhân'}
            {user?.birth_year ? ` • Sinh năm ${user.birth_year}` : ''}
          </Text>

          <View style={styles.verifiedRow}>
            <ShieldCheck size={14} color="#15803D" style={{ flexShrink: 0 }} />
            <Text style={styles.verifiedText}>
              Dữ liệu y tế mã hóa an toàn trên Supabase
            </Text>
          </View>
        </View>

        {/* Accessibility: Font Size Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.sectionHeader}>
            <Type size={20} color={Colors.primary} style={{ flexShrink: 0 }} />
            <Text style={styles.sectionTitle}>
              Cỡ Chữ Ứng Dụng
            </Text>
          </View>
          <Text style={styles.sectionSub}>
            Chọn kích thước chữ phù hợp với mắt của bác (áp dụng cho toàn bộ app):
          </Text>

          <View style={styles.scaleOptionsRow}>
            <TouchableOpacity
              style={[styles.scaleOption, (fontScale <= 1.05) && styles.scaleOptionActive]}
              onPress={() => setFontScale(1.0)}
            >
              <Text style={[styles.scaleLabel, (fontScale <= 1.05) && styles.scaleLabelActive, { fontSize: 13 }]} fixedSize>
                Chuẩn
              </Text>
              <Text style={styles.scaleSub} fixedSize>100%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scaleOption, (fontScale > 1.05 && fontScale <= 1.35) && styles.scaleOptionActive]}
              onPress={() => setFontScale(1.30)}
            >
              <Text style={[styles.scaleLabel, (fontScale > 1.05 && fontScale <= 1.35) && styles.scaleLabelActive, { fontSize: 15 }]} fixedSize>
                Lớn
              </Text>
              <Text style={styles.scaleSub} fixedSize>130%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scaleOption, (fontScale > 1.35) && styles.scaleOptionActive]}
              onPress={() => setFontScale(1.45)}
            >
              <Text style={[styles.scaleLabel, (fontScale > 1.35) && styles.scaleLabelActive, { fontSize: 17 }]} fixedSize>
                Rất lớn
              </Text>
              <Text style={styles.scaleSub} fixedSize>145%</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Accessibility: Voice Reading Speed */}
        <View style={styles.settingsSection}>
          <View style={styles.sectionHeader}>
            <Volume2 size={20} color={Colors.primary} style={{ flexShrink: 0 }} />
            <Text style={styles.sectionTitle}>
              Tốc Độ Giọng Đọc (TTS)
            </Text>
          </View>
          <Text style={styles.sectionSub}>
            Giọng đọc tiếng Việt tự động cho người cao tuổi:
          </Text>

          <View style={styles.scaleOptionsRow}>
            <TouchableOpacity
              style={[styles.scaleOption, ttsRate === 0.75 && styles.scaleOptionActive]}
              onPress={() => setTtsRate(0.75)}
            >
              <Text style={[styles.scaleLabel, ttsRate === 0.75 && styles.scaleLabelActive]}>Chậm rãi</Text>
              <Text style={styles.scaleSub} fixedSize>0.75x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scaleOption, ttsRate === 0.85 && styles.scaleOptionActive]}
              onPress={() => setTtsRate(0.85)}
            >
              <Text style={[styles.scaleLabel, ttsRate === 0.85 && styles.scaleLabelActive]}>Dễ nghe</Text>
              <Text style={styles.scaleSub} fixedSize>0.85x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scaleOption, ttsRate === 1.0 && styles.scaleOptionActive]}
              onPress={() => setTtsRate(1.0)}
            >
              <Text style={[styles.scaleLabel, ttsRate === 1.0 && styles.scaleLabelActive]}>Bình thường</Text>
              <Text style={styles.scaleSub} fixedSize>1.0x</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Family & Caregiver Links Shortcut */}
        <TouchableOpacity
          style={styles.actionRowCard}
          onPress={() => router.push('/care' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE', flexShrink: 0 }]}>
              <Users size={20} color="#0369A1" />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={styles.actionRowTitle}>
                Người Thân & Chăm Sóc
              </Text>
              <Text style={styles.actionRowDesc}>
                Xem hoặc cấp quyền chia sẻ kết quả cho con cái
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          <Text style={styles.logoutBtnText}>
            Đăng Xuất Tài Khoản
          </Text>
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
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  userRole: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.normalBg,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.normalText,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  scaleOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  scaleOption: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scaleOptionActive: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primary,
  },
  scaleLabel: {
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  scaleLabelActive: {
    color: Colors.primary,
  },
  scaleSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  actionRowDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
});
