import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { fontScale } = usePreferences();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchRecentDocs = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs || []);
    } catch (e) {
      console.warn('Fetch docs error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecentDocs();
  }, []);

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
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>Xin chào, {greetingName}! 👋</Text>
              <Text style={styles.greetingSubtitle}>Hôm nay bác cảm thấy thế nào?</Text>
            </View>
            <TTSButton text={voiceGreeting} label="Đọc lời chào" compact />
          </View>

          <View style={styles.elderlyBadge}>
            <ShieldCheck size={14} color="#15803D" />
            <Text style={styles.elderlyBadgeText}>Chế độ phông chữ lớn & Đọc to dễ nghe đã kích hoạt</Text>
          </View>
        </View>

        {/* Primary CTA: Scan Document Big Button */}
        <TouchableOpacity
          style={styles.scanCtaCard}
          onPress={() => router.push('/(tabs)/scan' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.scanCtaLeft}>
            <View style={styles.scanIconWrapper}>
              <Camera size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanCtaTitle}>Chụp Phiếu Khám Mới</Text>
              <Text style={styles.scanCtaDesc}>Chụp ảnh đơn thuốc hoặc phiếu xét nghiệm để AI đọc ngay</Text>
            </View>
          </View>
          <ArrowRight size={22} color="#FFFFFF" />
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
              <Pill size={22} color="#0369A1" />
            </View>
            <Text style={styles.gridTitle}>Hộp Thuốc</Text>
            <Text style={styles.gridDesc}>Nhắc giờ uống thuốc trong ngày</Text>
          </TouchableOpacity>

          {/* AI Chatbot Shortcut */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/ai-chat' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Sparkles size={22} color="#D97706" />
            </View>
            <Text style={styles.gridTitle}>Hỏi Bác Sĩ AI</Text>
            <Text style={styles.gridDesc}>Giải thích ý nghĩa chỉ số sinh hóa</Text>
          </TouchableOpacity>
        </View>

        {/* Medication Compliance Banner */}
        <View style={styles.pillStatusCard}>
          <View style={styles.pillStatusLeft}>
            <CheckCircle2 size={22} color="#15803D" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pillStatusTitle}>Lịch uống thuốc hôm nay</Text>
              <Text style={styles.pillStatusDesc}>Bạn đã ghi nhận uống đủ liều sáng và trưa</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.pillStatusBtn}
            onPress={() => router.push('/medication' as any)}
          >
            <Text style={styles.pillStatusBtnText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Lab Documents Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <FileText size={20} color={Colors.primaryDark} />
            <Text style={styles.sectionTitle}>Phiếu Khám Gần Đây</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có tài liệu nào</Text>
            <Text style={styles.emptyDesc}>Bác hãy bấm nút xanh ở trên để chụp phiếu xét nghiệm đầu tiên nhé.</Text>
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

              <View style={{ flex: 1 }}>
                <Text style={styles.docItemTitle}>
                  {doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ Kê'}
                </Text>
                <View style={styles.docMetaRow}>
                  <Calendar size={13} color={Colors.textMuted} />
                  <Text style={styles.docMetaText}>{doc.issued_date || 'Gần đây'}</Text>
                  {doc.facility_name && (
                    <Text style={styles.docMetaFacility} numberOfLines={1}>• {doc.facility_name}</Text>
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
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  greetingSubtitle: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
    color: Colors.normalText,
  },
  scanCtaCard: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    padding: 18,
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
    gap: 14,
    flex: 1,
    paddingRight: 8,
  },
  scanIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCtaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scanCtaDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primaryLight,
    marginTop: 3,
    lineHeight: 18,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  gridDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  pillStatusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
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
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMain,
  },
  pillStatusDesc: {
    fontSize: 12,
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
  },
  pillStatusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
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
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  docItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docEmoji: {
    fontSize: 22,
  },
  docItemTitle: {
    fontSize: 15,
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
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  docMetaFacility: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
});
