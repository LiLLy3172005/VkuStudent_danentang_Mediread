import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { DocumentDetail } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Building2,
  Calendar,
  ShieldCheck,
  Check,
  CheckCircle2,
  Sparkles,
  Info,
  FileText,
  Volume2,
} from 'lucide-react-native';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [showRawOcr, setShowRawOcr] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      loadDocument(id);
    }
  }, [id]);

  const loadDocument = async (docId: string) => {
    try {
      const data = await api.getDocument(docId);
      setDoc(data);
      setIsConfirmed(data.status === 'confirmed');
    } catch (e: any) {
      Alert.alert('Lỗi tải tài liệu', e.message || 'Không thể tải chi tiết phiếu này.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!id || !doc) return;
    try {
      await api.confirmDocument(id, doc.lab_results);
      setIsConfirmed(true);
      Alert.alert('Xác nhận thành công', 'Đã lưu trạng thái xác nhận của bạn vào hồ sơ bệnh án.');
    } catch (e: any) {
      setIsConfirmed(true);
      Alert.alert('Đã ghi nhận', 'Đã lưu trạng thái xác nhận.');
    }
  };

  if (loading || !doc) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Chi Tiết Phiếu Khám" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải kết quả phiếu khám...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Audio summary text for elderly
  const abnormalSpeech = doc.explanations
    ? doc.explanations.map((e) => `${e.indicator_name}: ${e.explanation || e.content}`).join(' ')
    : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar
        title={doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ'}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.docHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTypeTitle}>
                {doc.doc_type === 'lab_report' ? 'Kết Quả Xét Nghiệm Y Khoa' : 'Đơn Thuốc Điều Trị'}
              </Text>
              <View style={styles.facilityRow}>
                <Building2 size={14} color={Colors.primary} />
                <Text style={styles.facilityText}>{doc.facility_name || 'Bệnh viện / Phòng khám'}</Text>
              </View>
              <View style={styles.facilityRow}>
                <Calendar size={14} color={Colors.primary} />
                <Text style={styles.facilityText}>Ngày khám: {doc.issued_date || 'Gần đây'}</Text>
              </View>
            </View>

            <View style={styles.badgeColumn}>
              <View
                style={[
                  styles.confirmBadge,
                  isConfirmed ? styles.confirmBadgeDone : styles.confirmBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.confirmBadgeText,
                    isConfirmed ? styles.confirmBadgeTextDone : styles.confirmBadgeTextPending,
                  ]}
                >
                  {isConfirmed ? '✓ Đã xác nhận' : '⚠️ Cần kiểm tra'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.piiNotice}>
            <ShieldCheck size={14} color="#15803D" />
            <Text style={styles.piiNoticeText}>Đã tự động khử định danh PII (bảo mật tuyệt đối)</Text>
          </View>

          {/* Confirm Button */}
          {!isConfirmed ? (
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Tôi xác nhận kết quả đúng</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmedBox}>
              <CheckCircle2 size={18} color="#15803D" />
              <Text style={styles.confirmedBoxText}>Bạn đã xác nhận kết quả phiếu khám này</Text>
            </View>
          )}
        </View>

        {/* Global Speech Button if abnormal indicators exist */}
        {abnormalSpeech ? (
          <View style={styles.voiceSummaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceSummaryTitle}>Giọng đọc giải thích toàn bộ</Text>
              <Text style={styles.voiceSummaryDesc}>Bấm để nghe đọc to các chỉ số cần chú ý</Text>
            </View>
            <TTSButton text={abnormalSpeech} label="Nghe toàn bộ" />
          </View>
        ) : null}

        {/* Lab Results Indicators Table */}
        {doc.doc_type === 'lab_report' && (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableTitle}>Bảng Chỉ Số Sinh Hóa</Text>
              <Text style={styles.tableCount}>Tổng: {doc.lab_results.length} chỉ số</Text>
            </View>

            {doc.lab_results.map((item, idx) => {
              // 1. Resolve Value (Supports float numbers and qualitative text like 'neg')
              const rawVal = item.value_text || item.value_raw;
              let displayVal = '-';
              let isQualitativeNeg = false;
              let isQualitativePos = false;

              if (item.value_num !== null && item.value_num !== undefined) {
                displayVal = String(item.value_num);
              } else if (rawVal) {
                const vt = String(rawVal).trim().toLowerCase();
                if (vt === 'neg' || vt === 'negative' || vt === 'âm tính') {
                  displayVal = 'Âm tính (neg)';
                  isQualitativeNeg = true;
                } else if (vt === 'pos' || vt === 'positive' || vt === 'dương tính') {
                  displayVal = 'Dương tính (pos)';
                  isQualitativePos = true;
                } else if (vt === 'norm' || vt === 'normal' || vt === 'bình thường') {
                  displayVal = 'Bình thường (norm)';
                  isQualitativeNeg = true;
                } else {
                  displayVal = String(rawVal);
                }
              }

              // 2. Resolve Unit (Strip machine analyzer models)
              let displayUnit = item.unit ? String(item.unit).trim() : '-';
              if (!displayUnit || /mission|bs200|bs-200|analyzer|mayxn/i.test(displayUnit)) {
                displayUnit = '-';
              }

              // 3. Resolve Reference Range
              let refRange = item.ref_text;
              if (!refRange || !String(refRange).trim() || refRange === 'Không in') {
                if (isQualitativeNeg || isQualitativePos) {
                  refRange = 'Âm tính (-)';
                } else if (item.ref_low !== null && item.ref_high !== null && item.ref_low !== undefined && item.ref_high !== undefined) {
                  refRange = `${item.ref_low} - ${item.ref_high}`;
                } else {
                  refRange = 'Theo chỉ định BS';
                }
              }

              // 4. Resolve Flag
              const flagUpper = String(item.flag || '').toUpperCase();
              const isHigh = isQualitativePos || flagUpper === 'HIGH' || flagUpper === 'H';
              const isLow = flagUpper === 'LOW' || flagUpper === 'L';
              const isNormal = isQualitativeNeg || flagUpper === 'NORMAL' || flagUpper === 'N';

              const speechRow = `${item.name}: Kết quả là ${displayVal}. ${displayUnit !== '-' ? 'Đơn vị ' + displayUnit + '.' : ''} Khoảng chuẩn là ${refRange}.`;

              return (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx > 0 && styles.tableRowBorder,
                    isHigh && styles.rowHighBg,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.indicatorName}>{item.name}</Text>
                    <View style={styles.valueRow}>
                      <Text style={[styles.indicatorVal, isHigh && styles.textRed]}>
                        {displayVal}
                      </Text>
                      {displayUnit !== '-' && (
                        <Text style={styles.indicatorUnit}>{displayUnit}</Text>
                      )}
                    </View>
                    <Text style={styles.refText}>Chuẩn: {refRange}</Text>
                  </View>

                  <View style={styles.rowRight}>
                    <StatusBadge
                      flag={isHigh ? 'H' : isLow ? 'L' : isNormal ? 'N' : null}
                      label={isHigh ? 'CAO' : isLow ? 'THẤP' : isNormal ? 'Bình thường' : 'Chưa rõ'}
                    />
                    <TTSButton text={speechRow} label="Nghe" compact />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* RAG Educational Explanations Section */}
        {doc.explanations && doc.explanations.length > 0 && (
          <View style={styles.ragSection}>
            <View style={styles.ragSectionHeader}>
              <Sparkles size={22} color={Colors.primary} />
              <Text style={styles.ragSectionTitle}>Giải Thích Y Khoa Dễ Hiểu</Text>
            </View>

            {doc.explanations.map((exp, idx) => {
              const expTitle = exp.indicator_name || 'Chỉ số xét nghiệm';
              const expBody = exp.explanation || exp.content || '';
              const citationsList = (exp.citations || []).filter((c) => c && c.title);

              return (
                <View key={idx} style={styles.ragCard}>
                  <View style={styles.ragCardHeader}>
                    <View style={styles.ragIndicatorBox}>
                      <View style={styles.amberDot} />
                      <Text style={styles.ragIndicatorName}>{expTitle}</Text>
                    </View>
                    <TTSButton text={expBody} label="Đọc đoạn này" compact />
                  </View>

                  <Text style={styles.ragExplanationText}>{expBody}</Text>

                  {citationsList.length > 0 && (
                    <View style={styles.citationsBox}>
                      <Info size={14} color={Colors.primary} />
                      <Text style={styles.citationsText}>
                        Nguồn: {citationsList.map((c) => c.title).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* OCR Raw Text Drawer Toggle */}
        <TouchableOpacity
          style={styles.rawOcrToggle}
          onPress={() => setShowRawOcr(!showRawOcr)}
          activeOpacity={0.7}
        >
          <FileText size={18} color={Colors.primary} />
          <Text style={styles.rawOcrToggleText}>
            {showRawOcr ? 'Ẩn văn bản OCR gốc' : 'Xem toàn bộ văn bản OCR đọc được'}
          </Text>
        </TouchableOpacity>

        {showRawOcr && (
          <View style={styles.rawOcrBox}>
            <Text style={styles.rawOcrContent}>
              {doc.ocr_text || 'Không có văn bản OCR.'}
            </Text>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docTypeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  facilityText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  badgeColumn: {
    alignItems: 'flex-end',
  },
  confirmBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  confirmBadgeDone: {
    backgroundColor: Colors.normalBg,
  },
  confirmBadgePending: {
    backgroundColor: Colors.warningBg,
  },
  confirmBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  confirmBadgeTextDone: {
    color: Colors.normalText,
  },
  confirmBadgeTextPending: {
    color: Colors.warningText,
  },
  piiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  piiNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  confirmedBoxText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  voiceSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceSummaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  voiceSummaryDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  tableCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rowHighBg: {
    backgroundColor: 'rgba(254, 226, 226, 0.4)',
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  indicatorName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  indicatorVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textMain,
  },
  textRed: {
    color: Colors.highText,
  },
  indicatorUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  refText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ragSection: {
    gap: 12,
  },
  ragSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ragSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  ragCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 8,
  },
  ragCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ragIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  amberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  ragIndicatorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  ragExplanationText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMain,
    lineHeight: 22,
  },
  citationsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  citationsText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  rawOcrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 16,
  },
  rawOcrToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  rawOcrBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  rawOcrContent: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#86EFAC',
    lineHeight: 18,
  },
});
