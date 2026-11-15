import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { CareLink } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { Users, ShieldCheck, HeartHandshake, CheckCircle2, UserPlus } from 'lucide-react-native';

export default function CaregiverScreen() {
  const [links, setLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const data = await api.getCareLinks();
      setLinks(data || []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    Alert.alert(
      'Kết nối người thân',
      'Mã liên kết của bạn là: MR-8829\n\nNgười thân có thể tải app MediRead và nhập mã này để cùng theo dõi sức khỏe của bạn.',
      [{ text: 'Đóng' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Người Thân & Chăm Sóc" subtitle="Liên kết người nhà cùng theo dõi kết quả" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.iconCircle}>
            <HeartHandshake size={28} color={Colors.primary} />
          </View>
          <Text style={styles.introTitle}>Chăm sóc sức khỏe gia đình</Text>
          <Text style={styles.introDesc}>
            Khi liên kết, con cái hoặc người chăm sóc có thể xem kết quả xét nghiệm, nhận nhắc nhở uống thuốc và hỗ trợ bạn từ xa.
          </Text>

          <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.85}>
            <UserPlus size={18} color="#FFFFFF" />
            <Text style={styles.inviteBtnText}>Mời Người Thân Kết Nối</Text>
          </TouchableOpacity>
        </View>

        {/* Linked Members List */}
        <View style={styles.sectionHeader}>
          <Users size={18} color={Colors.primaryDark} />
          <Text style={styles.sectionTitle}>Danh Sách Người Thân Đã Liên Kết</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : links.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có người thân nào liên kết</Text>
            <Text style={styles.emptyDesc}>
              Bác có thể bấm "Mời Người Thân Kết Nối" ở trên để gửi mã cho con cháu nhé.
            </Text>
          </View>
        ) : (
          links.map((link) => (
            <View key={link.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {link.caregiver_name ? link.caregiver_name.charAt(0).toUpperCase() : 'N'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{link.caregiver_name || 'Người chăm sóc gia đình'}</Text>
                <Text style={styles.memberRole}>Quyền xem: Kết quả xét nghiệm & Lịch uống thuốc</Text>
              </View>

              <View style={styles.statusBadge}>
                <CheckCircle2 size={14} color="#15803D" />
                <Text style={styles.statusBadgeText}>Đã kết nối</Text>
              </View>
            </View>
          ))
        )}

        {/* Security & RLS notice */}
        <View style={styles.privacyCard}>
          <ShieldCheck size={18} color="#15803D" />
          <Text style={styles.privacyText}>
            Quyền riêng tư tuyệt đối: Chỉ người thân được bạn đồng ý cấp mã mới có thể xem hồ sơ bệnh án qua cơ chế Row Level Security của Supabase.
          </Text>
        </View>
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
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 6,
  },
  inviteBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  memberRole: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.normalBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.normalText,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyText: {
    fontSize: 12,
    color: Colors.textMain,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
});
