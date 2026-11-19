import React from 'react';
import { View, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { AppText as Text } from '../common/AppText';
import { Colors } from '../../theme/colors';
import { ShieldCheck, Sparkles } from 'lucide-react-native';

interface ProcessingModalProps {
  visible: boolean;
  message?: string;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  visible,
  message = 'AI đang số hóa và phân tích phiếu khám...',
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Sparkles size={32} color={Colors.primary} />
          </View>

          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 14 }} />

          <Text style={styles.title}>Đang Xử Lý Tài Liệu</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.stepsBox}>
            <View style={styles.stepRow}>
              <ShieldCheck size={16} color={Colors.primary} />
              <Text style={styles.stepText}>Bảo mật: Che thông tin PII tự động</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepDot}>•</Text>
              <Text style={styles.stepText}>Đọc chữ tiếng Việt bằng PaddleOCR</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepDot}>•</Text>
              <Text style={styles.stepText}>Tra cứu dược thư & tri thức y khoa RAG</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 63, 70, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  stepsBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    width: 16,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMain,
    flex: 1,
  },
});
