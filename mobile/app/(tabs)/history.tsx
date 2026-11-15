import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { DocumentSummary } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, Calendar, ChevronRight, Filter } from 'lucide-react-native';

export default function HistoryScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'lab_report' | 'prescription'>('all');

  const fetchDocuments = async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data || []);
      setFilteredDocs(data || []);
    } catch (e) {
      console.warn('Fetch history error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Lịch Sử Phiếu Khám" subtitle="Tra cứu các đơn thuốc và xét nghiệm đã đọc" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo bệnh viện, ngày khám..."
            placeholderTextColor={Colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
              Tất cả ({documents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'lab_report' && styles.filterChipActive]}
            onPress={() => setFilterType('lab_report')}
          >
            <Text style={[styles.filterChipText, filterType === 'lab_report' && styles.filterChipTextActive]}>
              Xét nghiệm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'prescription' && styles.filterChipActive]}
            onPress={() => setFilterType('prescription')}
          >
            <Text style={[styles.filterChipText, filterType === 'prescription' && styles.filterChipTextActive]}>
              Đơn thuốc
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document List */}
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 30 }} />
        ) : filteredDocs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Không tìm thấy tài liệu phù hợp</Text>
            <Text style={styles.emptyDesc}>Bác có thể thử tìm kiếm bằng từ khóa khác hoặc quét thêm phiếu mới.</Text>
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
                <Text style={styles.docEmoji}>
                  {doc.doc_type === 'lab_report' ? '🔬' : '💊'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>
                  {doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ Kê'}
                </Text>
                <View style={styles.metaRow}>
                  <Calendar size={13} color={Colors.textMuted} />
                  <Text style={styles.metaDate}>{doc.issued_date || 'Gần đây'}</Text>
                  {doc.facility_name && (
                    <Text style={styles.metaFacility} numberOfLines={1}>• {doc.facility_name}</Text>
                  )}
                </View>
              </View>

              <View style={styles.rightAction}>
                <StatusBadge
                  flag={doc.status === 'confirmed' ? 'N' : null}
                  label={doc.status === 'confirmed' ? 'Đã duyệt' : 'Cần xem'}
                />
                <ChevronRight size={18} color={Colors.textMuted} />
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
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textMain,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
    marginTop: 20,
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
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docEmojiWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docEmoji: {
    fontSize: 22,
  },
  docTitle: {
    fontSize: 15,
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
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  metaFacility: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
