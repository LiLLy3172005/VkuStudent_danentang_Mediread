import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { CareLink, DocumentSummary } from '../../types';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import {
  Users,
  ShieldCheck,
  HeartHandshake,
  CheckCircle2,
  QrCode,
  Camera,
  Copy,
  ChevronRight,
  FileText,
  X,
  UserCheck,
  ArrowRight,
  Sparkles,
  Calendar,
  Phone,
  Trash2,
  UserX,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CaregiverScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'my_qr' | 'connect'>(
    user?.role === 'caregiver' ? 'connect' : 'my_qr'
  );
  const [links, setLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // QR Scanner modal
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Patient documents modal (for caregiver viewing patient's documents)
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [patientDocs, setPatientDocs] = useState<DocumentSummary[]>([]);
  const [loadingPatientDocs, setLoadingPatientDocs] = useState<boolean>(false);

  const userCode = user?.id
    ? `MR-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
    : 'MR-000000';

  const qrImageUrl = user?.id
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=mediread:care:${user.id}`
    : '';

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await api.getCareLinks();
      setLinks(data || []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    setCopied(true);
    Alert.alert('Đã sao chép mã', `Mã kết nối của bác: ${userCode}\n\nBác hãy gửi mã này cho con cái để cùng theo dõi sức khỏe nhé!`);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConnectByCode = async (codeToUse?: string) => {
    const target = (codeToUse || inputCode).trim();
    if (!target) {
      Alert.alert('Chưa nhập mã', 'Vui lòng nhập mã kết nối hoặc quét mã QR của người thân.');
      return;
    }

    setConnecting(true);
    try {
      const res = await api.connectCareLink(target);
      Alert.alert('Kết nối thành công! 🎉', res.message || 'Đã liên kết hồ sơ người thân thành công.');
      setInputCode('');
      setShowScanner(false);
      await loadLinks();
    } catch (e: any) {
      Alert.alert('Không thể kết nối', e.message || 'Mã kết nối không hợp lệ hoặc người dùng không tồn tại.');
    } finally {
      setConnecting(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Cần quyền Camera', 'Bác/Bạn vui lòng cấp quyền Camera để quét mã QR kết nối.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!showScanner) return;
    setShowScanner(false);
    handleConnectByCode(data);
  };

  const handleViewPatientDocs = async (patientId: string, patientName: string) => {
    setSelectedPatient({ id: patientId, name: patientName });
    setLoadingPatientDocs(true);
    try {
      const docs = await api.listPatientDocuments(patientId);
      setPatientDocs(docs || []);
    } catch {
      setPatientDocs([]);
    } finally {
      setLoadingPatientDocs(false);
    }
  };

  const handleRevokeLink = (linkId: string, name?: string) => {
    Alert.alert(
      'Hủy liên kết',
      `Bác/Bạn có chắc chắn muốn hủy liên kết với ${name || 'người thân này'} không? Quyền xem hồ sơ sẽ tạm thời bị ngắt.`,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Hủy liên kết',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.revokeCareLink(linkId);
              Alert.alert('Thành công', 'Đã hủy liên kết thành công.');
              await loadLinks();
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể hủy liên kết.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteLink = (linkId: string, name?: string) => {
    Alert.alert(
      'Xóa người thân khỏi danh sách',
      `Bác/Bạn có chắc chắn muốn xóa hoàn toàn ${name || 'người thân này'} khỏi danh sách kết nối không? Dữ liệu liên kết sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCareLink(linkId);
              Alert.alert('Đã xóa', 'Đã xóa người thân khỏi danh sách liên kết.');
              await loadLinks();
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể xóa liên kết.');
            }
          },
        },
      ]
    );
  };

  // Filter links based on current user's role and ID
  const myCaregivers = links.filter((l) => l.patient_id === user?.id);
  const caringFor = links.filter((l) => l.caregiver_id === user?.id);

  const mySpeechGuide = `Mã kết nối của bác là ${userCode.split('').join(' ')}. Bác hãy đưa màn hình này cho con cái quét mã QR để con cái có thể theo dõi kết quả xét nghiệm và nhắc nhở uống thuốc từ xa.`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Người Thân & Chăm Sóc" subtitle="Liên kết người nhà cùng theo dõi sức khỏe" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'my_qr' && styles.tabBtnActive]}
            onPress={() => setActiveTab('my_qr')}
            activeOpacity={0.8}
          >
            <QrCode
              size={18}
              color={activeTab === 'my_qr' ? '#FFFFFF' : Colors.primaryDark}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'my_qr' && styles.tabBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Mã QR Của Tôi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'connect' && styles.tabBtnActive]}
            onPress={() => setActiveTab('connect')}
            activeOpacity={0.8}
          >
            <HeartHandshake
              size={18}
              color={activeTab === 'connect' ? '#FFFFFF' : Colors.primaryDark}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'connect' && styles.tabBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Quét QR Kết Nối
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'my_qr' ? (
          /* TAB 1: PATIENT QR DISPLAY */
          <View style={styles.tabContent}>
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <View style={styles.iconCircle}>
                  <QrCode size={22} color="#073F46" />
                </View>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={styles.qrTitle} numberOfLines={2}>Mã QR Sức Khỏe Của Bác</Text>
                  <Text style={styles.qrSub} numberOfLines={2}>Đưa mã này cho con cái quét để kết nối</Text>
                </View>
                <TTSButton text={mySpeechGuide} label="Nghe" compact />
              </View>

              {/* QR Image Box */}
              <View style={styles.qrWrapper}>
                {qrImageUrl ? (
                  <Image source={{ uri: qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
                ) : (
                  <ActivityIndicator size="large" color={Colors.primary} />
                )}
              </View>

              {/* Connection Code Display */}
              <View style={styles.codeBox}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.codeLabel}>MÃ KẾT NỐI CÁ NHÂN</Text>
                  <Text
                    style={styles.codeText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {userCode}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.7}>
                  <Copy size={16} color={copied ? '#15803D' : Colors.primary} style={{ flexShrink: 0 }} />
                  <Text style={[styles.copyBtnText, copied && { color: '#15803D' }]}>
                    {copied ? 'Đã chép' : 'Sao chép'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.qrInstructions}>
                💡 Con cái của bác chỉ cần tải app MediRead, chọn "Quét QR Kết Nối" và hướng camera vào mã QR này là xong.
              </Text>
            </View>

            {/* List of Connected Caregivers */}
            <View style={styles.sectionHeader}>
              <Users size={18} color={Colors.primaryDark} />
              <Text style={styles.sectionTitle}>Con Cháu Đang Theo Dõi Hồ Sơ</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : myCaregivers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Chưa có người thân nào kết nối</Text>
                <Text style={styles.emptyDesc}>
                  Bác hãy đưa mã QR ở trên cho con cái để cùng theo dõi kết quả xét nghiệm và lịch uống thuốc nhé.
                </Text>
              </View>
            ) : (
              myCaregivers.map((link) => {
                const displayName = link.caregiver_name || 'Con cái / Người chăm sóc';
                const phoneText = link.caregiver_phone || 'Chưa cập nhật SĐT';
                const isRevoked = link.status === 'revoked';
                return (
                  <View key={link.id} style={styles.memberCard}>
                    <View style={styles.memberCardTop}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
                        <Text style={styles.memberPhone} numberOfLines={1}>📞 {phoneText}</Text>
                        <Text style={styles.memberRole} numberOfLines={1}>Quyền xem: Phiếu khám & Lịch uống thuốc</Text>
                      </View>
                      <View style={[styles.statusBadge, isRevoked && styles.statusBadgeRevoked]}>
                        <CheckCircle2 size={13} color={isRevoked ? '#DC2626' : '#15803D'} style={{ flexShrink: 0 }} />
                        <Text style={[styles.statusBadgeText, isRevoked && { color: '#DC2626' }]}>
                          {isRevoked ? 'Đã hủy' : 'Đang kết nối'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.linkActionRow}>
                      {!isRevoked && (
                        <TouchableOpacity
                          style={styles.revokeBtn}
                          onPress={() => handleRevokeLink(link.id, displayName)}
                          activeOpacity={0.7}
                        >
                          <UserX size={14} color="#C2410C" />
                          <Text style={styles.revokeBtnText}>Hủy liên kết</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteLinkBtn}
                        onPress={() => handleDeleteLink(link.id, displayName)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={14} color="#DC2626" />
                        <Text style={styles.deleteLinkBtnText}>Xóa người thân</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* TAB 2: CAREGIVER SCAN & CONNECT TO PATIENT */
          <View style={styles.tabContent}>
            <View style={styles.connectCard}>
              <View style={styles.connectCardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Camera size={22} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectTitle} numberOfLines={2}>Kết Nối Với Hồ Sơ Của Bố Mẹ</Text>
                  <Text style={styles.connectSub} numberOfLines={2}>Quét mã QR hoặc nhập mã cá nhân của cụ</Text>
                </View>
              </View>

              {/* Big Camera Scan Button */}
              <TouchableOpacity
                style={styles.scanCameraBtn}
                onPress={handleOpenScanner}
                activeOpacity={0.85}
              >
                <Camera size={20} color="#FFFFFF" style={{ flexShrink: 0 }} />
                <Text style={styles.scanCameraBtnText} numberOfLines={2}>
                  Bật Camera Quét Mã QR Của Cụ
                </Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>HOẶC NHẬP MÃ SỐ</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Input Code Form */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="Ví dụ: MR-600823 hoặc ID cụ"
                  placeholderTextColor={Colors.textMuted}
                  value={inputCode}
                  onChangeText={setInputCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.submitCodeBtn, connecting && { opacity: 0.7 }]}
                  onPress={() => handleConnectByCode()}
                  disabled={connecting}
                  activeOpacity={0.8}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitCodeBtnText}>Kết Nối</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* List of Connected Parents/Patients */}
            <View style={styles.sectionHeader}>
              <UserCheck size={18} color={Colors.primaryDark} />
              <Text style={styles.sectionTitle}>Hồ Sơ Người Thân Đang Chăm Sóc</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : caringFor.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Chưa kết nối với người thân nào</Text>
                <Text style={styles.emptyDesc}>
                  Bạn có thể quét mã QR trên điện thoại của bố mẹ để theo dõi kết quả xét nghiệm và lịch uống thuốc từ xa.
                </Text>
              </View>
            ) : (
              caringFor.map((link) => {
                const displayName = link.patient_name || 'Hồ sơ người thân';
                const phoneText = link.patient_phone || 'Chưa cập nhật SĐT';
                const isRevoked = link.status === 'revoked';
                return (
                  <View key={link.id} style={styles.patientLinkCard}>
                    <View style={styles.patientLinkTop}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
                        <Text style={styles.memberPhone} numberOfLines={1}>📞 {phoneText}</Text>
                        <Text style={styles.memberRole} numberOfLines={1}>
                          {isRevoked ? 'Trạng thái: Đã tạm ngắt kết nối' : 'Trạng thái: Đang theo dõi hồ sơ y tế'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, isRevoked && styles.statusBadgeRevoked]}>
                        <CheckCircle2 size={13} color={isRevoked ? '#DC2626' : '#15803D'} style={{ flexShrink: 0 }} />
                        <Text style={[styles.statusBadgeText, isRevoked && { color: '#DC2626' }]}>
                          {isRevoked ? 'Đã hủy' : 'Hoạt động'}
                        </Text>
                      </View>
                    </View>

                    {!isRevoked && (
                      <TouchableOpacity
                        style={styles.viewDocsBtn}
                        onPress={() => handleViewPatientDocs(link.patient_id, displayName)}
                        activeOpacity={0.8}
                      >
                        <FileText size={16} color="#FFFFFF" style={{ flexShrink: 0 }} />
                        <Text style={styles.viewDocsBtnText} numberOfLines={2}>
                          Xem Kết Quả Xét Nghiệm & Đơn Thuốc Của Cụ
                        </Text>
                        <ChevronRight size={16} color="#FFFFFF" style={{ flexShrink: 0 }} />
                      </TouchableOpacity>
                    )}

                    <View style={styles.linkActionRow}>
                      {!isRevoked && (
                        <TouchableOpacity
                          style={styles.revokeBtn}
                          onPress={() => handleRevokeLink(link.id, displayName)}
                          activeOpacity={0.7}
                        >
                          <UserX size={14} color="#C2410C" />
                          <Text style={styles.revokeBtnText}>Hủy liên kết</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteLinkBtn}
                        onPress={() => handleDeleteLink(link.id, displayName)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={14} color="#DC2626" />
                        <Text style={styles.deleteLinkBtnText}>Xóa người thân</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Privacy Card */}
        <View style={styles.privacyCard}>
          <ShieldCheck size={18} color="#15803D" style={{ flexShrink: 0 }} />
          <Text style={styles.privacyText}>
            Bảo mật tuyệt đối: Chỉ người thân được cụ cấp mã QR mới có thể xem hồ sơ bệnh án qua hàng rào phân quyền y tế Row Level Security.
          </Text>
        </View>
      </ScrollView>

      {/* QR CAMERA SCANNER MODAL */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setShowScanner(false)}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.scannerHeaderTitle}>Quét Mã QR Của Người Thân</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.cameraFrameWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Overlay Viewfinder Box */}
            <View style={styles.viewfinderBox}>
              <View style={[styles.scannerCorner, styles.cornerTL]} />
              <View style={[styles.scannerCorner, styles.cornerTR]} />
              <View style={[styles.scannerCorner, styles.cornerBL]} />
              <View style={[styles.scannerCorner, styles.cornerBR]} />
            </View>
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerHint}>
              Hướng camera vào mã QR sức khỏe trên điện thoại của bố mẹ để kết nối tự động.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* PATIENT DOCUMENTS MODAL */}
      <Modal visible={!!selectedPatient} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalDocTag}>HỒ SƠ Y TẾ NGƯỜI THÂN</Text>
                <Text style={styles.modalIndicatorTitle} numberOfLines={1}>
                  {selectedPatient?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPatient(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {loadingPatientDocs ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 30 }} />
              ) : patientDocs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Chưa có tài liệu nào trong hồ sơ của cụ</Text>
                  <Text style={styles.emptyDesc}>Cụ chưa tải lên phiếu xét nghiệm hoặc đơn thuốc nào.</Text>
                </View>
              ) : (
                patientDocs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.patientDocItem}
                    onPress={() => {
                      setSelectedPatient(null);
                      router.push(`/document/${doc.id}` as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.docEmojiBox}>
                      <Text style={{ fontSize: 24 }}>{doc.doc_type === 'lab_report' ? '🔬' : '💊'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientDocTitle} numberOfLines={1}>
                        {doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ Kê'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Calendar size={12} color={Colors.textMuted} />
                        <Text style={{ fontSize: 12, color: Colors.textMuted }}>{doc.issued_date || 'Gần đây'}</Text>
                        {doc.facility_name ? (
                          <Text style={{ fontSize: 12, color: Colors.textMuted }}>• {doc.facility_name}</Text>
                        ) : null}
                      </View>
                    </View>
                    <ChevronRight size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ))
              )}
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
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabBtnActive: {
    backgroundColor: '#073F46',
  },
  tabBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    textAlign: 'center',
    flexShrink: 1,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    gap: 16,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  qrTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primaryDark,
    lineHeight: 23,
  },
  qrSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    gap: 12,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  copyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  qrInstructions: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  connectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 16,
  },
  connectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primaryDark,
    lineHeight: 23,
  },
  connectSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  scanCameraBtn: {
    backgroundColor: '#073F46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#073F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  scanCameraBtnText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMain,
  },
  submitCodeBtn: {
    backgroundColor: '#15803D',
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    minHeight: 48,
    flexShrink: 0,
  },
  submitCodeBtnText: {
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
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.textMain,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberPhone: {
    fontSize: 13,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  linkActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  deleteLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  deleteLinkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  statusBadgeRevoked: {
    backgroundColor: '#FEE2E2',
  },
  patientLinkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  patientLinkTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  memberRole: {
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  viewDocsBtn: {
    backgroundColor: '#073F46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
  },
  viewDocsBtnText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 21,
    fontWeight: '500',
  },
  // QR Camera Scanner Modal Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeScannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraFrameWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderBox: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerFooter: {
    padding: 24,
    alignItems: 'center',
  },
  scannerHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Patient docs modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  modalIndicatorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  docEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientDocTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.textMain,
  },
});
