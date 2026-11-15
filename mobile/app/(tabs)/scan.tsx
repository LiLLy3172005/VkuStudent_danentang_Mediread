import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { HeaderBar } from '../../components/common/HeaderBar';
import { ProcessingModal } from '../../components/scanner/ProcessingModal';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UploadCloud,
  FileSpreadsheet,
  Pill,
} from 'lucide-react-native';

export default function ScanScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [docType, setDocType] = useState<'lab_report' | 'prescription'>('lab_report');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('Đang tải ảnh lên máy chủ an toàn...');

  const handlePickCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền máy ảnh', 'Bác vui lòng cho phép ứng dụng dùng máy ảnh để chụp phiếu khám nhé.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi chụp ảnh', e.message || 'Không thể mở máy ảnh lúc này.');
    }
  };

  const handlePickLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi chọn ảnh', e.message || 'Không thể truy cập thư viện ảnh.');
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProcessingStage('Đang tải ảnh lên máy chủ & che thông tin cá nhân PII...');

    try {
      const filename = `scan_${Date.now()}.jpg`;
      const uploadRes = await api.uploadDocument(selectedImage, filename, docType);
      const documentId = uploadRes.document_id;

      // Poll document status until worker completes OCR & RAG
      setProcessingStage('AI đang nhận diện chữ bằng PaddleOCR & tra cứu RAG...');
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      let completedDoc = null;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        attempts += 1;
        try {
          const checkDoc = await api.getDocument(documentId);
          if (checkDoc && checkDoc.status !== 'uploaded' && checkDoc.status !== 'processing') {
            completedDoc = checkDoc;
            break;
          }
        } catch {
          // Worker still writing, wait next cycle
        }
      }

      setIsProcessing(false);
      setSelectedImage(null);

      // Navigate to detail
      router.push(`/document/${documentId}` as any);
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert('Lỗi xử lý', e.message || 'Không thể số hóa tài liệu này. Bác vui lòng thử lại ảnh chụp rõ nét hơn.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Quét & Đọc Tài Liệu" subtitle="Chụp phiếu xét nghiệm hoặc đơn thuốc" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Document Type Selector */}
        <View style={styles.docTypeWrapper}>
          <Text style={styles.sectionLabel}>Chọn loại phiếu cần đọc:</Text>
          <View style={styles.typeButtonsRow}>
            <TouchableOpacity
              style={[styles.typeBtn, docType === 'lab_report' && styles.typeBtnActive]}
              onPress={() => setDocType('lab_report')}
              activeOpacity={0.8}
            >
              <FileSpreadsheet size={16} color={docType === 'lab_report' ? '#FFFFFF' : Colors.primaryDark} style={{ flexShrink: 0 }} />
              <Text
                style={[styles.typeBtnText, docType === 'lab_report' && styles.typeBtnTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Phiếu Xét Nghiệm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, docType === 'prescription' && styles.typeBtnActive]}
              onPress={() => setDocType('prescription')}
              activeOpacity={0.8}
            >
              <Pill size={16} color={docType === 'prescription' ? '#FFFFFF' : Colors.primaryDark} style={{ flexShrink: 0 }} />
              <Text
                style={[styles.typeBtnText, docType === 'prescription' && styles.typeBtnTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Đơn Thuốc Bác Sĩ
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Image Preview or Capture Placeholder */}
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />

            <View style={styles.previewControls}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.7}
              >
                <RotateCcw size={18} color={Colors.textMain} />
                <Text style={styles.retakeBtnText}>Chụp lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmUploadBtn}
                onPress={handleUploadAndProcess}
                activeOpacity={0.85}
              >
                <UploadCloud size={20} color="#FFFFFF" />
                <Text style={styles.confirmUploadText}>Tiến Hành Phân Tích</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraPlaceholder}>
            {/* Guide frame */}
            <View style={styles.scanTargetBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <Camera size={48} color={Colors.primary} style={{ opacity: 0.8 }} />
              <Text style={styles.guideText}>Đặt phiếu xét nghiệm hoặc đơn thuốc ngay ngắn trong khung hình</Text>
            </View>

            {/* Action Buttons: Camera and Library */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryCaptureBtn}
                onPress={handlePickCamera}
                activeOpacity={0.85}
              >
                <Camera size={24} color="#FFFFFF" />
                <Text style={styles.primaryCaptureText}>Mở Máy Ảnh Chụp Ngay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryPickerBtn}
                onPress={handlePickLibrary}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color={Colors.primaryDark} />
                <Text style={styles.secondaryPickerText}>Chọn ảnh sẵn từ Thư viện</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Elderly Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <AlertTriangle size={18} color="#C2410C" />
            <Text style={styles.tipsTitle}>Mẹo nhỏ để đọc kết quả chuẩn xác nhất:</Text>
          </View>
          <Text style={styles.tipItem}>• Giữ yên tay, chụp nơi đủ ánh sáng, tránh bị bóng tay che khuất.</Text>
          <Text style={styles.tipItem}>• Trải phẳng tờ giấy trước khi chụp, chụp thẳng đứng từ trên xuống.</Text>
          <Text style={styles.tipItem}>• Hệ thống tự động xóa tên và địa chỉ để bảo vệ thông tin riêng tư.</Text>
        </View>
      </ScrollView>

      {/* Processing Modal */}
      <ProcessingModal visible={isProcessing} message={processingStage} />
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
  docTypeWrapper: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  typeBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
    flexShrink: 1,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  cameraPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 20,
  },
  scanTargetBox: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 4, borderRightWidth: 4 },
  guideText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 240,
    lineHeight: 20,
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  primaryCaptureBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCaptureText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryPickerBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
  },
  secondaryPickerText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 16,
  },
  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    backgroundColor: '#000',
  },
  previewControls: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  confirmUploadBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  confirmUploadText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tipsCard: {
    backgroundColor: Colors.warningBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    gap: 6,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.warningText,
  },
  tipItem: {
    fontSize: 13,
    color: '#7C2D12',
    lineHeight: 18,
    fontWeight: '500',
  },
});
