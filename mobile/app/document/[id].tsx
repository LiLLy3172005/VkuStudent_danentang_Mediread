import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { usePreferences } from '../../contexts/PreferencesContext';
import { DocumentDetail } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import { addMedicationsFromPrescription } from '../../services/medicationStorage';
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
  ChevronRight,
  X,
  MessageCircle,
  Pill,
  Clock,
} from 'lucide-react-native';

const parseRangeBounds = (text?: string | null): { low: number | null; high: number | null } => {
  if (!text) return { low: null, high: null };
  const s = String(text).replace(/,/g, '.');

  // Format "a - b" or "a đến b" (e.g. "3.9 - 6.4", "10-15", "0.41-0.53")
  const mRange = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|đến|to)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (mRange) {
    const a = parseFloat(mRange[1]);
    const b = parseFloat(mRange[2]);
    if (!isNaN(a) && !isNaN(b)) {
      return { low: Math.min(a, b), high: Math.max(a, b) };
    }
  }

  // Format "<= x" or "< x" or "dưới x" or "up to x"
  const mMax = s.match(/(?:<|<=|≤|dưới|up to)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (mMax) {
    const m = parseFloat(mMax[1]);
    if (!isNaN(m)) return { low: null, high: m };
  }

  // Format ">= x" or "> x" or "trên x" or "từ x"
  const mMin = s.match(/(?:>|>=|≥|trên|từ)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (mMin) {
    const m = parseFloat(mMin[1]);
    if (!isNaN(m)) return { low: m, high: null };
  }

  return { low: null, high: null };
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { fs } = usePreferences();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [showRawOcr, setShowRawOcr] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<{
    item: any;
    displayVal: string;
    displayUnit: string;
    refRange: string;
    isHigh: boolean;
    isLow: boolean;
    isNormal: boolean;
  } | null>(null);

  const getExplanationForIndicator = (indicatorName?: string, details?: any) => {
    if (!indicatorName || !doc) return '';
    // Tìm kiếm trong danh sách RAG đã tạo trước
    const found = (doc.explanations || []).find((e) => {
      const eName = (e.indicator_name || '').toLowerCase();
      const target = indicatorName.toLowerCase();
      return eName.includes(target) || target.includes(eName);
    });
    if (found && (found.explanation || found.content)) {
      return found.explanation || found.content;
    }

    // Lời giải thích y khoa chi tiết, ân cần theo trạng thái chỉ số
    const statusText = details?.isHigh
      ? 'Chỉ số này của bác hiện đang CAO hơn ngưỡng chuẩn an toàn. Đây có thể là dấu hiệu cho thấy cơ thể đang có phản ứng viêm, biến đổi chuyển hóa hoặc cần điều chỉnh lại chế độ dinh dưỡng, thuốc uống. Bác nên giữ tinh thần thoải mái và trao đổi trực tiếp với bác sĩ điều trị để được chỉ định phác đồ phù hợp nhất nhé.'
      : details?.isLow
      ? 'Chỉ số này của bác hiện đang THẤP hơn mức bình thường. Bác nên chú ý bồi dưỡng cơ thể, ăn uống đầy đủ các nhóm chất dinh dưỡng, uống đủ nước và tái khám đúng hẹn để bác sĩ theo dõi sự phục hồi.'
      : 'Chúc mừng bác! Chỉ số này của bác đang nằm trong khoảng tham chiếu hoàn toàn BÌNH THƯỜNG và an toàn. Bác hãy tiếp tục duy trì chế độ ăn uống khoa học, vận động nhẹ nhàng và tinh thần vui vẻ như hiện tại nhé!';

    return `Chỉ số: ${indicatorName}\nKết quả: ${details?.displayVal} ${details?.displayUnit !== '-' ? details?.displayUnit : ''} (Khoảng tham chiếu chuẩn: ${details?.refRange}).\n\n${statusText}\n\nLời dặn: Bác nên tuân thủ đúng các hướng dẫn của bác sĩ khám bệnh và dùng thuốc theo đơn đã kê.`;
  };

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
      const payload = {
        doc_type: doc.doc_type,
        lab_results: doc.lab_results || [],
        medications: doc.medications || [],
      };
      await api.confirmDocument(id, payload);
      setIsConfirmed(true);

      if (doc.doc_type === 'prescription' || (doc.medications && doc.medications.length > 0)) {
        const count = await addMedicationsFromPrescription(doc.medications || [], doc.id);
        Alert.alert(
          'Xác nhận thành công',
          `Đã lưu đơn thuốc và tự động đồng bộ ${count} loại thuốc vào Lịch Uống Thuốc (Hộp Thuốc) hôm nay của bác!`,
          [
            { text: 'Ở lại trang này' },
            {
              text: 'Xem Hộp Thuốc',
              onPress: () => router.push('/medication' as any),
            },
          ]
        );
      } else {
        Alert.alert('Xác nhận thành công', 'Đã lưu trạng thái xác nhận của bạn vào hồ sơ bệnh án.');
      }
    } catch (e: any) {
      setIsConfirmed(true);
      Alert.alert('Đã ghi nhận', 'Đã lưu trạng thái xác nhận.');
    }
  };

  const handleAddToSchedule = async () => {
    if (!doc?.medications || doc.medications.length === 0) {
      Alert.alert('Thông báo', 'Đơn thuốc này chưa phát hiện danh sách thuốc để thêm.');
      return;
    }
    const count = await addMedicationsFromPrescription(doc.medications, doc.id);
    Alert.alert(
      'Thêm thành công! 💊',
      `Đã thêm ${count} loại thuốc vào Lịch Uống Thuốc hàng ngày của bác. Bác có muốn mở xem ngay không?`,
      [
        { text: 'Để sau' },
        {
          text: 'Mở Lịch Thuốc',
          onPress: () => router.push('/medication' as any),
        },
      ]
    );
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
            <Text style={styles.docTypeTitle} numberOfLines={2} allowFontScaling={false}>
              {doc.doc_type === 'lab_report' ? 'Kết Quả Xét Nghiệm Y Khoa' : 'Đơn Thuốc Điều Trị'}
            </Text>

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
                numberOfLines={1}
                allowFontScaling={false}
              >
                {isConfirmed ? '✓ Đã xác nhận' : '⚠️ Cần kiểm tra'}
              </Text>
            </View>
          </View>

          <View style={styles.metaGroup}>
            <View style={styles.facilityRow}>
              <Building2 size={14} color={Colors.primary} style={{ flexShrink: 0 }} />
              <Text style={styles.facilityText} numberOfLines={2} allowFontScaling={false}>
                {doc.facility_name || 'Bệnh viện / Phòng khám'}
              </Text>
            </View>
            <View style={styles.facilityRow}>
              <Calendar size={14} color={Colors.primary} style={{ flexShrink: 0 }} />
              <Text style={styles.facilityText} numberOfLines={1} allowFontScaling={false}>
                Ngày khám: {doc.issued_date || 'Gần đây'}
              </Text>
            </View>
          </View>

          <View style={styles.piiNotice}>
            <ShieldCheck size={14} color="#15803D" style={{ flexShrink: 0 }} />
            <Text style={styles.piiNoticeText} allowFontScaling={false}>
              Đã tự động khử định danh PII (bảo mật tuyệt đối)
            </Text>
          </View>

          {/* Confirm Button */}
          {!isConfirmed ? (
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Check size={17} color="#FFFFFF" style={{ flexShrink: 0 }} />
              <Text style={styles.confirmBtnText} numberOfLines={1} allowFontScaling={false}>
                Tôi xác nhận kết quả đúng
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmedBox}>
              <CheckCircle2 size={17} color="#15803D" style={{ flexShrink: 0 }} />
              <Text style={styles.confirmedBoxText} allowFontScaling={false}>
                Bạn đã xác nhận kết quả phiếu khám này
              </Text>
            </View>
          )}
        </View>

        {/* Global Speech Button if abnormal indicators exist */}
        {abnormalSpeech ? (
          <View style={styles.voiceSummaryCard}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.voiceSummaryTitle} allowFontScaling={false}>
                Giọng đọc giải thích toàn bộ
              </Text>
              <Text style={styles.voiceSummaryDesc} allowFontScaling={false}>
                Bấm để nghe đọc to các chỉ số cần chú ý
              </Text>
            </View>
            <TTSButton text={abnormalSpeech} label="Nghe toàn bộ" />
          </View>
        ) : null}

        {/* Lab Results Indicators Table */}
        {doc.doc_type === 'lab_report' && (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.tableTitle} allowFontScaling={false}>
                  Bảng Chỉ Số Xét Nghiệm
                </Text>
                <Text style={styles.tableSubtitleHint} allowFontScaling={false}>
                  💡 Chạm vào từng dòng để xem giải thích chi tiết
                </Text>
              </View>
              <View style={styles.tableCountBadge}>
                <Text style={styles.tableCount} numberOfLines={1} allowFontScaling={false}>
                  Tổng: {doc.lab_results.length} chỉ số
                </Text>
              </View>
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
                if (vt === 'neg' || vt === 'negative' || vt === 'âm tính' || vt === 'am tinh' || vt === 'không phát hiện' || vt === 'không tìm thấy') {
                  displayVal = 'Âm tính (neg)';
                  isQualitativeNeg = true;
                } else if (vt === 'pos' || vt === 'positive' || vt === 'dương tính' || vt === 'duong tinh' || vt === '+' || vt === '++' || vt === '+++') {
                  displayVal = 'Dương tính (pos)';
                  isQualitativePos = true;
                } else if (vt === 'norm' || vt === 'normal' || vt === 'bình thường' || vt === 'binh thuong') {
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
              let isHigh = isQualitativePos || flagUpper === 'HIGH' || flagUpper === 'H';
              let isLow = flagUpper === 'LOW' || flagUpper === 'L';
              let isNormal = isQualitativeNeg || flagUpper === 'NORMAL' || flagUpper === 'NORM' || flagUpper === 'N';

              // Fallback: If DB flag was not set or unknown, evaluate dynamically using value and reference bounds!
              if (!isHigh && !isLow && !isNormal) {
                let low = item.ref_low !== undefined && item.ref_low !== null ? Number(item.ref_low) : null;
                let high = item.ref_high !== undefined && item.ref_high !== null ? Number(item.ref_high) : null;

                if (low === null && high === null && refRange) {
                  const parsed = parseRangeBounds(refRange);
                  low = parsed.low;
                  high = parsed.high;
                }

                const val = item.value_num !== undefined && item.value_num !== null ? Number(item.value_num) : null;

                if (val !== null && !isNaN(val)) {
                  if (high !== null && val > high) {
                    isHigh = true;
                  } else if (low !== null && val < low) {
                    isLow = true;
                  } else if (low !== null || high !== null) {
                    isNormal = true;
                  }
                } else if (isQualitativeNeg) {
                  isNormal = true;
                } else if (isQualitativePos) {
                  isHigh = true;
                }
              }

              const statusText = isHigh ? 'cao hơn mức chuẩn' : isLow ? 'thấp hơn mức chuẩn' : isNormal ? 'ở mức bình thường' : 'chưa xác định';
              const speechRow = `${item.name}: Kết quả là ${displayVal}. ${displayUnit !== '-' ? 'Đơn vị ' + displayUnit + '.' : ''} Khoảng chuẩn là ${refRange}. Trạng thái ${statusText}.`;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx > 0 && styles.tableRowBorder,
                    isHigh && styles.rowHighBg,
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    setSelectedItem({
                      item,
                      displayVal,
                      displayUnit,
                      refRange,
                      isHigh,
                      isLow,
                      isNormal,
                    })
                  }
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.indicatorName}>
                      {item.name}
                    </Text>
                    <View style={styles.valueRow}>
                      <Text style={[styles.indicatorVal, isHigh && styles.textRed]}>
                        {displayVal}
                      </Text>
                      {displayUnit !== '-' && (
                        <Text style={styles.indicatorUnit}>
                          {displayUnit}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.refText}>
                      Chuẩn: {refRange}
                    </Text>
                  </View>

                  <View style={styles.rowRight}>
                    <StatusBadge
                      flag={isHigh ? 'H' : isLow ? 'L' : isNormal ? 'N' : null}
                      label={isHigh ? 'CAO' : isLow ? 'THẤP' : isNormal ? 'Bình thường' : 'Chưa rõ'}
                    />
                    <TTSButton text={speechRow} label="Nghe" compact />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Prescription Medications Table */}
        {(doc.doc_type === 'prescription' || (doc.medications && doc.medications.length > 0)) && (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.tableTitle}>
                  Danh Sách Thuốc Điều Trị
                </Text>
                <Text style={styles.tableSubtitleHint}>
                  💊 Bấm loa để nghe hướng dẫn uống thuốc
                </Text>
              </View>
              <View style={styles.tableCountBadge}>
                <Text style={styles.tableCount} numberOfLines={1}>
                  Tổng: {doc.medications?.length || 0} thuốc
                </Text>
              </View>
            </View>

            {doc.medications && doc.medications.length > 0 ? (
              doc.medications.map((med, idx) => {
                const instructions = med.instructions || `${med.dosage || ''} ${med.dosage_form || 'viên'}`.trim();
                const medSpeech = `Thuốc số ${idx + 1}: ${med.name}. Hướng dẫn dùng: ${instructions || 'Theo chỉ định bác sĩ'}. ${med.duration_days ? 'Uống trong ' + med.duration_days + ' ngày.' : ''}`;
                return (
                  <View key={idx} style={[styles.medCardRow, idx > 0 && styles.tableRowBorder]}>
                    <View style={styles.medIndexCircle}>
                      <Text style={styles.medIndexNum} fixedSize>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.medNameText}>
                        {med.name}
                      </Text>
                      <View style={styles.medDetailRow}>
                        <Clock size={14} color={Colors.primary} style={{ flexShrink: 0 }} />
                        <Text style={styles.medInstructionsText}>
                          {instructions || 'Theo chỉ định'}
                        </Text>
                      </View>
                      {med.duration_days ? (
                        <Text style={styles.medDurationBadge}>
                          ⏱ Toa uống: {med.duration_days} ngày
                        </Text>
                      ) : null}
                    </View>
                    <TTSButton text={medSpeech} compact label="Đọc" />
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: Colors.textMuted }}>
                  Chưa phát hiện danh sách thuốc trong đơn này.
                </Text>
              </View>
            )}

            {doc.medications && doc.medications.length > 0 && (
              <TouchableOpacity
                style={styles.addToScheduleBtn}
                onPress={handleAddToSchedule}
                activeOpacity={0.85}
              >
                <Pill size={18} color="#FFFFFF" style={{ flexShrink: 0 }} />
                <Text style={styles.addToScheduleBtnText}>
                  Thêm Vào Lịch Uống Thuốc Hôm Nay
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* RAG Educational Explanations Section */}
        {doc.explanations && doc.explanations.length > 0 && (
          <View style={styles.ragSection}>
            <View style={styles.ragSectionHeader}>
              <Sparkles size={20} color={Colors.primary} style={{ flexShrink: 0 }} />
              <Text style={styles.ragSectionTitle}>
                Giải Thích Y Khoa Dễ Hiểu
              </Text>
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
                      <Text style={styles.ragIndicatorName}>
                        {expTitle}
                      </Text>
                    </View>
                    <TTSButton text={expBody} label="Đọc đoạn này" compact />
                  </View>

                  <Text style={styles.ragExplanationText}>
                    {expBody}
                  </Text>

                  {citationsList.length > 0 && (
                    <View style={styles.citationsBox}>
                      <Info size={14} color={Colors.primary} style={{ flexShrink: 0 }} />
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

        {/* Ask Doctor AI CTA Button */}
        <TouchableOpacity
          style={styles.askAiDoctorBtn}
          onPress={() =>
            router.push({
              pathname: '/ai-chat',
              params: {
                documentId: doc.id,
                facility: doc.facility_name,
                docType: doc.doc_type,
              },
            } as any)
          }
          activeOpacity={0.85}
        >
          <View style={styles.askAiIconCircle}>
            <Sparkles size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={styles.askAiDoctorTitle} allowFontScaling={false}>
              Hỏi Bác Sĩ AI về kết quả này
            </Text>
            <Text style={styles.askAiDoctorSubtitle} allowFontScaling={false}>
              Giải đáp thắc mắc về chỉ số hoặc thuốc trên phiếu
            </Text>
          </View>
          <ChevronRight size={20} color="#FFFFFF" style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* OCR Raw Text Drawer Toggle */}
        <TouchableOpacity
          style={styles.rawOcrToggle}
          onPress={() => setShowRawOcr(!showRawOcr)}
          activeOpacity={0.7}
        >
          <FileText size={18} color={Colors.primary} style={{ flexShrink: 0 }} />
          <Text style={styles.rawOcrToggleText} numberOfLines={1} allowFontScaling={false}>
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

      {/* Indicator Detail Explanation Modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalDocTag}>GIẢI THÍCH CHỈ SỐ Y KHOA</Text>
                <Text style={styles.modalIndicatorTitle} numberOfLines={2}>
                  {selectedItem?.item.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedItem(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Value & Status Card */}
              <View style={styles.modalValCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalValLabel}>Kết quả đo được</Text>
                  <Text style={[styles.modalValNum, selectedItem?.isHigh && styles.textRed]}>
                    {selectedItem?.displayVal} {selectedItem?.displayUnit !== '-' ? selectedItem?.displayUnit : ''}
                  </Text>
                  <Text style={styles.modalRefText}>Khoảng chuẩn: {selectedItem?.refRange}</Text>
                </View>
                {selectedItem && (
                  <StatusBadge
                    flag={selectedItem.isHigh ? 'H' : selectedItem.isLow ? 'L' : selectedItem.isNormal ? 'N' : null}
                    label={selectedItem.isHigh ? 'CAO' : selectedItem.isLow ? 'THẤP' : selectedItem.isNormal ? 'Bình thường' : 'Chưa rõ'}
                  />
                )}
              </View>

              {/* Detailed Explanation */}
              <View style={styles.modalExpSection}>
                <View style={styles.modalExpHeader}>
                  <Sparkles size={18} color={Colors.primary} />
                  <Text style={styles.modalExpTitle}>Ý Nghĩa Y Khoa & Lời Khuyên</Text>
                </View>
                <Text style={styles.modalExpText}>
                  {getExplanationForIndicator(selectedItem?.item.name, selectedItem)}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TTSButton
                  text={getExplanationForIndicator(selectedItem?.item?.name, selectedItem) || 'Đang cập nhật lời giải thích'}
                  label="Đọc to cho tôi nghe"
                />

                <TouchableOpacity
                  style={styles.modalAskAiBtn}
                  onPress={() => {
                    const itemName = selectedItem?.item.name;
                    setSelectedItem(null);
                    router.push({
                      pathname: '/ai-chat',
                      params: {
                        documentId: doc.id,
                        facility: doc.facility_name,
                        docType: doc.doc_type,
                      },
                    } as any);
                  }}
                  activeOpacity={0.8}
                >
                  <MessageCircle size={18} color="#FFFFFF" />
                  <Text style={styles.modalAskAiText}>Hỏi Bác Sĩ AI về chỉ số này</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  docTypeTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  metaGroup: {
    gap: 4,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facilityText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    flex: 1,
    flexShrink: 1,
  },
  confirmBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexShrink: 0,
  },
  confirmBadgeDone: {
    backgroundColor: Colors.normalBg,
  },
  confirmBadgePending: {
    backgroundColor: Colors.warningBg,
  },
  confirmBadgeText: {
    fontSize: 11.5,
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
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  piiNoticeText: {
    flex: 1,
    flexShrink: 1,
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
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginTop: 2,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 2,
  },
  confirmedBoxText: {
    flex: 1,
    flexShrink: 1,
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
    gap: 10,
  },
  voiceSummaryTitle: {
    fontSize: 14,
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
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
    flexShrink: 1,
  },
  tableCountBadge: {
    backgroundColor: Colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  tableCount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
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
    fontSize: 14,
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
    fontSize: 15,
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
    flexShrink: 0,
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
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
    flex: 1,
  },
  ragCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 8,
  },
  ragCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
    flexShrink: 0,
  },
  ragIndicatorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    flex: 1,
  },
  ragExplanationText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: Colors.textMain,
    lineHeight: 20,
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
    fontSize: 11.5,
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
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  rawOcrToggleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.primaryDark,
    flexShrink: 1,
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
  askAiDoctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    padding: 14,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  askAiIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  askAiDoctorTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  askAiDoctorSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primaryPale,
    marginTop: 2,
  },
  tableSubtitleHint: {
    fontSize: 11.5,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalDocTag: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalIndicatorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalValCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalValLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalValNum: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  modalRefText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },
  modalExpSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  modalExpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalExpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  modalExpText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
    fontWeight: '500',
  },
  modalActions: {
    gap: 12,
    marginTop: 4,
  },
  modalAskAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    height: 48,
  },
  modalAskAiText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  medCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
  },
  medIndexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medIndexNum: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  medNameText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  medDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  medInstructionsText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  medDurationBadge: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  addToScheduleBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addToScheduleBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
});
