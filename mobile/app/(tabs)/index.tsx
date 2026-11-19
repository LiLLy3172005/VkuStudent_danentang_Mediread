import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { api } from '../../services/api';
import { DocumentSummary } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Camera,
  FileText,
  Pill,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  BellRing,
  ChevronRight,
} from 'lucide-react-native';
import { getMedicationSchedule } from '../../services/medicationStorage';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { fs } = usePreferences();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dueSlotInfo, setDueSlotInfo] = useState<{ slot: string; count: number } | null>(null);

  const checkDueMedication = useCallback(async () => {
    try {
      const schedule = await getMedicationSchedule();
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      let activeSlot: 'morning' | 'noon' | 'evening' | null = null;
      let slotName = '';

      if (currentHour >= 6.0 && currentHour <= 10.5) {
        activeSlot = 'morning';
        slotName = 'Cữ Sáng';
      } else if (currentHour >= 11.0 && currentHour <= 14.0) {
        activeSlot = 'noon';
        slotName = 'Cữ Trưa';
      } else if (currentHour >= 17.5 && currentHour <= 22.0) {
        activeSlot = 'evening';
        slotName = 'Cữ Tối';
      }

      if (activeSlot) {
        const pendingInSlot = schedule.filter((d) => d.timeSlot === activeSlot && !d.taken);
        if (pendingInSlot.length > 0) {
          setDueSlotInfo({ slot: slotName, count: pendingInSlot.length });
          return;
        }
      }
      setDueSlotInfo(null);
    } catch {
      setDueSlotInfo(null);
    }
  }, []);

  const fetchRecentDocs = useCallback(async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs || []);
      await checkDueMedication();
    } catch (e) {
      console.warn('Fetch docs error:', e);
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, checkDueMedication]);

  useEffect(() => {
    setLoading(true);
    setDocuments([]);
    fetchRecentDocs();
  }, [user?.id, fetchRecentDocs]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentDocs();
      checkDueMedication();
    }, [fetchRecentDocs, checkDueMedication])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecentDocs();
  };

  const greetingName = user?.full_name ? `Bác ${user.full_name}` : 'Bác';
  const voiceGreeting = `Xin chào ${greetingName}. Hôm nay bạn cảm thấy thế nào? Hãy chụp đơn thuốc hoặc phiếu xét nghiệm để cháu đọc giúp nhé.`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="MediRead AI" subtitle="Trợ lý y tế người cao tuổi" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Welcome Greeting Banner */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingTop}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.greetingHello}>
                Xin chào! 👋
              </Text>
              <Text style={styles.greetingTitle} numberOfLines={1}>
                {greetingName}
              </Text>
              <Text style={styles.greetingSubtitle}>
                Hôm nay bác cảm thấy thế nào?
              </Text>
            </View>
            <TTSButton text={voiceGreeting} label="Đọc lời chào" compact />
          </View>

          <View style={styles.elderlyBadge}>
            <ShieldCheck size={14} color="#15803D" style={{ flexShrink: 0 }} />
            <Text style={styles.elderlyBadgeText}>
              Chế độ phông chữ lớn & Đọc to dễ nghe đã kích hoạt
            </Text>
          </View>
        </View>

        {/* Real-time Due Medication Alert Banner */}
        {dueSlotInfo && (
          <TouchableOpacity
            style={styles.realtimeDueBanner}
            onPress={() => router.push('/medication' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.realtimeDueIcon}>
              <BellRing size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.realtimeDueTitle}>
                ĐẾN GIỜ UỐNG THUỐC ({dueSlotInfo.slot})!
              </Text>
              <Text style={styles.realtimeDueDesc}>
                Bác còn {dueSlotInfo.count} loại thuốc cần uống. Bấm vào đây để xem và đánh dấu nhé.
              </Text>
            </View>
            <ChevronRight size={22} color="#C2410C" />
          </TouchableOpacity>
        )}

        {/* Primary CTA: Scan Document Big Button */}
        <TouchableOpacity
          style={styles.scanCtaCard}
          onPress={() => router.push('/(tabs)/scan' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.scanCtaLeft}>
            <View style={styles.scanIconWrapper}>
              <Camera size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanCtaTitle}>
                Chụp Phiếu Khám Mới
              </Text>
              <Text style={styles.scanCtaDesc}>
                Chụp ảnh đơn thuốc hoặc phiếu xét nghiệm để AI đọc ngay
              </Text>
            </View>
          </View>
          <ArrowRight size={20} color="#FFFFFF" style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Quick Action Grid */}
        <View style={styles.quickGrid}>
          {/* Medication Tracker Shortcut */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/medication' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Pill size={20} color="#0369A1" />
            </View>
            <Text style={styles.gridTitle}>
              Hộp Thuốc
            </Text>
            <Text style={styles.gridDesc}>
              Nhắc giờ uống thuốc trong ngày
            </Text>
          </TouchableOpacity>

          {/* AI Chatbot Shortcut */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/ai-chat' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Sparkles size={20} color="#D97706" />
            </View>
            <Text style={styles.gridTitle}>
              Hỏi Bác Sĩ AI
            </Text>
            <Text style={styles.gridDesc}>
              Giải thích ý nghĩa chỉ số sinh hóa
            </Text>
          </TouchableOpacity>
        </View>

        {/* Medication Compliance Banner */}
        <View style={styles.pillStatusCard}>
          <View style={styles.pillStatusLeft}>
            <CheckCircle2 size={20} color="#15803D" style={{ flexShrink: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pillStatusTitle}>
                Lịch uống thuốc hôm nay
              </Text>
              <Text style={styles.pillStatusDesc}>
                Bạn đã ghi nhận uống đủ liều sáng và trưa
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.pillStatusBtn}
            onPress={() => router.push('/medication' as any)}
          >
            <Text style={styles.pillStatusBtnText}>
              Xem chi tiết
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Lab Documents Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <FileText size={18} color={Colors.primaryDark} style={{ flexShrink: 0 }} />
            <Text style={styles.sectionTitle}>
              Phiếu Khám Gần Đây
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
            <Text style={styles.seeAllText}>
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Chưa có tài liệu nào
            </Text>
            <Text style={styles.emptyDesc}>
              Bác hãy bấm nút xanh ở trên để chụp phiếu xét nghiệm hoặc đơn thuốc đầu tiên nhé.
            </Text>
          </View>
        ) : (
          documents.slice(0, 3).map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docItemCard}
              onPress={() => router.push(`/document/${doc.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.docIconBox}>
                <Text style={styles.docEmoji}>
                  {doc.doc_type === 'lab_report' ? '🔬' : '💊'}
                </Text>
              </View>

              <View style={{ flex: 1, flexShrink: 1, paddingRight: 4 }}>
                <Text style={styles.docItemTitle} numberOfLines={1}>
                  {doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ Kê'}
                </Text>
                <View style={styles.docMetaRow}>
                  <Calendar size={12} color={Colors.textMuted} style={{ flexShrink: 0 }} />
                  <Text style={styles.docMetaText} numberOfLines={1}>
                    {doc.issued_date || 'Gần đây'}
                  </Text>
                  {doc.facility_name && (
                    <Text style={styles.docMetaFacility} numberOfLines={1}>
                      • {doc.facility_name}
                    </Text>
                  )}
                </View>
              </View>

              <StatusBadge
                flag={doc.status === 'confirmed' ? 'N' : null}
                label={doc.status === 'confirmed' ? 'Đã duyệt' : 'Cần xem'}
              />
            </TouchableOpacity>
          ))
        )}
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
    paddingBottom: 32,
    gap: 16,
  },
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  greetingHello: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.accent,
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.primaryDark,
    marginTop: 1,
    marginBottom: 2,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  elderlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.normalBg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  elderlyBadgeText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.normalText,
  },
  realtimeDueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F97316',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  realtimeDueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  realtimeDueTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#9A3412',
    letterSpacing: 0.3,
  },
  realtimeDueDesc: {
    fontSize: 13.5,
    color: '#C2410C',
    marginTop: 2,
    lineHeight: 18,
    fontWeight: '600',
  },
  scanCtaCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  scanCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  scanIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  scanCtaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scanCtaDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primaryLight,
    marginTop: 2,
    lineHeight: 17,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  gridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  gridTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  gridDesc: {
    fontSize: 11.5,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  pillStatusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pillStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pillStatusTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.textMain,
  },
  pillStatusDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  pillStatusBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  pillStatusBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
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
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  docItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  docEmoji: {
    fontSize: 20,
  },
  docItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMain,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  docMetaText: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontWeight: '500',
    flexShrink: 0,
  },
  docMetaFacility: {
    fontSize: 11.5,
    color: Colors.textMuted,
    flex: 1,
    flexShrink: 1,
  },
});
