import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { DocumentSummary } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, Calendar, ChevronRight, Trash2 } from 'lucide-react-native';

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { fs } = usePreferences();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'lab_report' | 'prescription'>('all');

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data || []);
      setFilteredDocs(data || []);
    } catch (e) {
      console.warn('Fetch history error:', e);
      setDocuments([]);
      setFilteredDocs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    setDocuments([]);
    setFilteredDocs([]);
    fetchDocuments();
  }, [user?.id, fetchDocuments]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  useEffect(() => {
    let result = documents;
    if (filterType !== 'all') {
      result = result.filter((d) => d.doc_type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.facility_name && d.facility_name.toLowerCase().includes(q)) ||
          (d.issued_date && d.issued_date.includes(q))
      );
    }
    setFilteredDocs(result);
  }, [searchQuery, filterType, documents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handleDeleteDoc = (docId: string, docType: string) => {
    const isLab = docType === 'lab_report';
    Alert.alert(
      isLab ? 'Xóa phiếu xét nghiệm' : 'Xóa đơn thuốc',
      `Bác/Bạn có chắc chắn muốn xóa ${isLab ? 'phiếu xét nghiệm' : 'đơn thuốc'} này khỏi hồ sơ không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDocument(docId);
              setDocuments((prev) => prev.filter((d) => d.id !== docId));
              setFilteredDocs((prev) => prev.filter((d) => d.id !== docId));
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể xóa tài liệu.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Lịch Sử Phiếu Khám" subtitle="Tra cứu các đơn thuốc và xét nghiệm đã đọc" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.textMuted} style={{ flexShrink: 0 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo bệnh viện, ngày khám..."
            placeholderTextColor={Colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            allowFontScaling={false}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]} numberOfLines={1} allowFontScaling={false}>
              Tất cả ({documents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'lab_report' && styles.filterChipActive]}
            onPress={() => setFilterType('lab_report')}
          >
            <Text style={[styles.filterChipText, filterType === 'lab_report' && styles.filterChipTextActive]} numberOfLines={1} allowFontScaling={false}>
              Xét nghiệm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'prescription' && styles.filterChipActive]}
            onPress={() => setFilterType('prescription')}
          >
            <Text style={[styles.filterChipText, filterType === 'prescription' && styles.filterChipTextActive]} numberOfLines={1} allowFontScaling={false}>
              Đơn thuốc
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document List */}
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 30 }} />
        ) : filteredDocs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle} allowFontScaling={false}>
              Chưa có tài liệu nào
            </Text>
            <Text style={styles.emptyDesc} maxFontSizeMultiplier={1.1}>
              {searchQuery.trim()
                ? 'Không tìm thấy phiếu khám khớp với từ khóa của bác.'
                : 'Tài khoản của bác hiện chưa có phiếu khám nào. Bác hãy qua tab Quét để chụp phiếu xét nghiệm hoặc đơn thuốc mới nhé.'}
            </Text>
          </View>
        ) : (
          filteredDocs.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => router.push(`/document/${doc.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.docEmojiWrapper}>
                <Text style={styles.docEmoji} allowFontScaling={false}>
                  {doc.doc_type === 'lab_report' ? '🔬' : '💊'}
                </Text>
              </View>

              <View style={{ flex: 1, flexShrink: 1, paddingRight: 4 }}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ Kê'}
                </Text>
                <View style={styles.metaRow}>
                  <Calendar size={12} color={Colors.textMuted} style={{ flexShrink: 0 }} />
                  <Text style={styles.metaDate} numberOfLines={1}>
                    {doc.issued_date || 'Gần đây'}
                  </Text>
                  {doc.facility_name && (
                    <Text style={styles.metaFacility} numberOfLines={1}>
                      • {doc.facility_name}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.rightAction}>
                <StatusBadge
                  flag={doc.status === 'confirmed' ? 'N' : null}
                  label={doc.status === 'confirmed' ? 'Đã duyệt' : 'Cần xem'}
                />
                <TouchableOpacity
                  style={styles.deleteMiniBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteDoc(doc.id, doc.doc_type);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
                <ChevronRight size={16} color={Colors.textMuted} style={{ flexShrink: 0 }} />
              </View>
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
    paddingBottom: 40,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMain,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 2,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textMain,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
    marginTop: 16,
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
    lineHeight: 19,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docEmojiWrapper: {
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
  docTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMain,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  metaDate: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontWeight: '500',
    flexShrink: 0,
  },
  metaFacility: {
    fontSize: 11.5,
    color: Colors.textMuted,
    flex: 1,
    flexShrink: 1,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  deleteMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
