import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Vibration,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import {
  Pill,
  Check,
  Clock,
  Sun,
  Sunset,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Bell,
  BellRing,
  AlertTriangle,
  X,
  Volume2,
  CheckCircle2,
  Trash2,
  Camera,
} from 'lucide-react-native';
import {
  DoseItem,
  getMedicationSchedule,
  saveMedicationSchedule,
  clearMedicationSchedule,
  DEFAULT_DOSES,
} from '../../services/medicationStorage';
import { speechService } from '../../services/speech';

export default function MedicationScreen() {
  const router = useRouter();
  const [doses, setDoses] = useState<DoseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(new Date());

  // Alarm & On-screen reminder state
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [alarmSlot, setAlarmSlot] = useState<'morning' | 'noon' | 'evening'>('morning');

  // Manual Add Medication state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedDosage, setNewMedDosage] = useState<string>('1 viên');
  const [newMedSlot, setNewMedSlot] = useState<'morning' | 'noon' | 'evening'>('morning');
  const [newMedInstructions, setNewMedInstructions] = useState<string>('Uống sau khi ăn no');

  useEffect(() => {
    (async () => {
      const saved = await getMedicationSchedule();
      setDoses(saved);
      setLoading(false);
    })();

    // Real-time ticker every 5 seconds
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleDose = async (id: string) => {
    const updated = doses.map((d) => (d.id === id ? { ...d, taken: !d.taken } : d));
    setDoses(updated);
    await saveMedicationSchedule(updated);
  };

  const markAllInSlotTaken = async (slot: 'morning' | 'noon' | 'evening') => {
    const updated = doses.map((d) => (d.timeSlot === slot ? { ...d, taken: true } : d));
    setDoses(updated);
    await saveMedicationSchedule(updated);
    setShowAlarmModal(false);
    Alert.alert('Đã hoàn thành! 🎉', 'Bác đã uống đủ thuốc cho cữ này. Chúc bác luôn khỏe mạnh!');
  };

  const resetDayDoses = async () => {
    Alert.alert(
      'Bắt đầu ngày mới',
      'Bác có muốn đặt lại trạng thái để đánh dấu uống thuốc cho ngày hôm nay không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          onPress: async () => {
            const reset = doses.map((d) => ({ ...d, taken: false }));
            setDoses(reset);
            await saveMedicationSchedule(reset);
          },
        },
      ]
    );
  };

  const handleClearAllMedications = () => {
    Alert.alert(
      'Xóa toàn bộ lịch uống thuốc',
      'Bác có chắc chắn muốn xóa toàn bộ danh sách thuốc đang có trong lịch không? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: async () => {
            setDoses([]);
            await clearMedicationSchedule();
            await saveMedicationSchedule([]);
          },
        },
      ]
    );
  };

  const handleAddMedication = async () => {
    if (!newMedName.trim()) {
      Alert.alert('Chưa có tên thuốc', 'Bác vui lòng nhập tên thuốc cần thêm vào lịch nhé!');
      return;
    }

    const slotLabel = newMedSlot === 'morning' ? 'Cữ Sáng' : newMedSlot === 'noon' ? 'Cữ Trưa' : 'Cữ Tối';
    const newDose: DoseItem = {
      id: `manual-${Date.now()}`,
      name: newMedName.trim(),
      dosage: newMedDosage.trim() || '1 viên',
      timeSlot: newMedSlot,
      instructions: newMedInstructions.trim() || 'Uống theo chỉ định của bác sĩ',
      taken: false,
    };

    const updated = [...doses, newDose];
    setDoses(updated);
    await saveMedicationSchedule(updated);

    setShowAddModal(false);
    setNewMedName('');
    setNewMedDosage('1 viên');
    setNewMedInstructions('Uống sau khi ăn no');

    Alert.alert('Thêm thuốc thành công! 🎉', `Thuốc "${newDose.name}" đã được thêm vào ${slotLabel}.`);
  };

  const handleDeleteDose = (id: string, name: string) => {
    Alert.alert(
      'Xóa thuốc khỏi lịch',
      `Bác có chắc muốn xóa thuốc "${name}" khỏi lịch uống thuốc không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa thuốc',
          style: 'destructive',
          onPress: async () => {
            const updated = doses.filter((d) => d.id !== id);
            setDoses(updated);
            await saveMedicationSchedule(updated);
          },
        },
      ]
    );
  };

  // Real-time helper
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const getSlotTimingStatus = (slot: 'morning' | 'noon' | 'evening', slotDoses: DoseItem[]) => {
    const allTaken = slotDoses.length > 0 && slotDoses.every((d) => d.taken);
    if (allTaken) {
      return { status: 'done', label: '✓ ĐÃ UỐNG ĐỦ', color: '#15803D', bg: '#DCFCE7' };
    }

    // Windows: Morning 06:00 - 10:30, Noon 11:00 - 14:00, Evening 17:30 - 22:00
    if (slot === 'morning') {
      if (currentHour >= 6.0 && currentHour <= 10.5) {
        return { status: 'due_now', label: '🔥 ĐẾN GIỜ UỐNG SÁNG', color: '#C2410C', bg: '#FDF1DC' };
      }
      if (currentHour > 10.5) {
        return { status: 'overdue', label: '⚠️ QUÁ GIỜ (Cần uống bù)', color: '#DC2626', bg: '#FEE2E2' };
      }
      return { status: 'upcoming', label: '⏳ SẮP TỚI (07:30)', color: '#0F766E', bg: '#E6F4F2' };
    }

    if (slot === 'noon') {
      if (currentHour >= 11.0 && currentHour <= 14.0) {
        return { status: 'due_now', label: '🔥 ĐẾN GIỜ UỐNG TRƯA', color: '#C2410C', bg: '#FDF1DC' };
      }
      if (currentHour > 14.0) {
        return { status: 'overdue', label: '⚠️ QUÁ GIỜ (Cần uống bù)', color: '#DC2626', bg: '#FEE2E2' };
      }
      return { status: 'upcoming', label: '⏳ SẮP TỚI (11:30)', color: '#0F766E', bg: '#E6F4F2' };
    }

    if (slot === 'evening') {
      if (currentHour >= 17.5 && currentHour <= 22.0) {
        return { status: 'due_now', label: '🔥 ĐẾN GIỜ UỐNG TỐI', color: '#C2410C', bg: '#FDF1DC' };
      }
      if (currentHour > 22.0) {
        return { status: 'overdue', label: '⚠️ QUÁ GIỜ (Cần uống bù)', color: '#DC2626', bg: '#FEE2E2' };
      }
      return { status: 'upcoming', label: '⏳ SẮP TỚI (19:30)', color: '#0F766E', bg: '#E6F4F2' };
    }

    return { status: 'upcoming', label: '⏳ SẮP TỚI', color: '#0F766E', bg: '#E6F4F2' };
  };

  const triggerAlarm = (slot: 'morning' | 'noon' | 'evening') => {
    setAlarmSlot(slot);
    setShowAlarmModal(true);

    const slotName = slot === 'morning' ? 'Cữ Sáng' : slot === 'noon' ? 'Cữ Trưa' : 'Cữ Tối';
    const targetDoses = doses.filter((d) => d.timeSlot === slot);
    const medNames = targetDoses.map((d) => `${d.name}, ${d.dosage}`).join('. ');

    Vibration.vibrate([0, 500, 200, 500]);
    speechService.speak(
      `Bác ơi! Đã đến giờ uống thuốc ${slotName}. Thuốc gồm có: ${medNames}. Bác hãy uống ngay kèm một cốc nước ấm nhé!`
    );
  };

  const morningDoses = doses.filter((d) => d.timeSlot === 'morning');
  const noonDoses = doses.filter((d) => d.timeSlot === 'noon');
  const eveningDoses = doses.filter((d) => d.timeSlot === 'evening');

  const totalDoses = doses.length;
  const takenCount = doses.filter((d) => d.taken).length;

  const morningStatus = getSlotTimingStatus('morning', morningDoses);
  const noonStatus = getSlotTimingStatus('noon', noonDoses);
  const eveningStatus = getSlotTimingStatus('evening', eveningDoses);

  // Identify next or active slot
  let activeOrNextSlot = 'Cữ Sáng (07:30)';
  if (currentHour > 10.5 && currentHour <= 14.0) activeOrNextSlot = 'Cữ Trưa (11:30)';
  else if (currentHour > 14.0 && currentHour <= 22.0) activeOrNextSlot = 'Cữ Tối (19:30)';

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Lịch Uống Thuốc" subtitle="Theo dõi đúng giờ thời gian thực & Báo thức nhắc nhở" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Real-time Clock & Reminder Banner */}
        <View style={styles.realtimeBanner}>
          <View style={styles.realtimeHeader}>
            <View style={styles.clockBadge}>
              <Clock size={15} color={Colors.primary} />
              <Text style={styles.clockText} numberOfLines={1}>Hiện tại: {timeString}</Text>
            </View>

            <TouchableOpacity
              style={styles.testAlarmBtn}
              onPress={() => {
                // Pick the first due or active slot
                const slotToAlarm =
                  morningStatus.status === 'due_now'
                    ? 'morning'
                    : noonStatus.status === 'due_now'
                    ? 'noon'
                    : eveningStatus.status === 'due_now'
                    ? 'evening'
                    : currentHour >= 12
                    ? 'evening'
                    : 'morning';
                triggerAlarm(slotToAlarm);
              }}
              activeOpacity={0.8}
            >
              <BellRing size={14} color="#FFFFFF" />
              <Text style={styles.testAlarmBtnText} numberOfLines={1}>Thử Báo Thức</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.realtimeSub}>
            ⏰ Hệ thống theo dõi thời gian thực. Cữ kế tiếp:{' '}
            <Text style={{ fontWeight: '800', color: Colors.primaryDark }}>{activeOrNextSlot}</Text>.
          </Text>
        </View>

        {/* Compliance Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.progressTitle} numberOfLines={1}>Tiến Độ Uống Thuốc Hôm Nay</Text>
              <Text style={styles.progressSub} numberOfLines={2}>
                {takenCount === totalDoses && totalDoses > 0
                  ? 'Tuyệt vời! Bác đã uống đủ tất cả các cữ hôm nay.'
                  : `Bác đã uống ${takenCount}/${totalDoses} cữ thuốc.`}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {totalDoses > 0 ? `${Math.round((takenCount / totalDoses) * 100)}%` : '0%'}
              </Text>
            </View>
          </View>
          {totalDoses > 0 && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.round((takenCount / totalDoses) * 100))}%` },
                ]}
              />
            </View>
          )}
        </View>

        {/* Action Controls Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.addMedBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addMedBtnText} numberOfLines={1}>Thêm thuốc mới</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={resetDayDoses} activeOpacity={0.7}>
            <RotateCcw size={15} color={Colors.primary} />
            <Text style={styles.resetBtnText} numberOfLines={1}>Ngày mới</Text>
          </TouchableOpacity>

          {doses.length > 0 && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAllMedications} activeOpacity={0.7}>
              <Trash2 size={15} color="#DC2626" />
              <Text style={styles.clearAllBtnText} numberOfLines={1}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Morning Dose Section */}
        {morningDoses.length > 0 && (
          <View
            style={[
              styles.timeSlotBox,
              morningStatus.status === 'due_now' && styles.slotBoxDueNow,
              morningStatus.status === 'overdue' && styles.slotBoxOverdue,
            ]}
          >
            <View style={styles.slotHeader}>
              <View style={styles.slotHeaderTop}>
                <View style={[styles.slotIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Sun size={20} color="#D97706" />
                </View>
                <View style={styles.slotTitleCol}>
                  <Text style={styles.slotTitle} numberOfLines={1}>Cữ Sáng (07:00 - 08:30)</Text>
                  <Text style={styles.slotSub} numberOfLines={1}>Uống sau khi ăn sáng no</Text>
                </View>
              </View>

              <View style={styles.slotHeaderBottom}>
                <View style={[styles.statusTag, { backgroundColor: morningStatus.bg, borderColor: morningStatus.color }]}>
                  <Text style={[styles.statusTagText, { color: morningStatus.color }]}>
                    {morningStatus.label}
                  </Text>
                </View>
              </View>
            </View>

            {morningDoses.map((dose) => renderDoseRow(dose, toggleDose, handleDeleteDose))}
          </View>
        )}

        {/* Noon Dose Section */}
        {noonDoses.length > 0 && (
          <View
            style={[
              styles.timeSlotBox,
              noonStatus.status === 'due_now' && styles.slotBoxDueNow,
              noonStatus.status === 'overdue' && styles.slotBoxOverdue,
            ]}
          >
            <View style={styles.slotHeader}>
              <View style={styles.slotHeaderTop}>
                <View style={[styles.slotIconBadge, { backgroundColor: '#FFEDD5' }]}>
                  <Sunset size={20} color="#EA580C" />
                </View>
                <View style={styles.slotTitleCol}>
                  <Text style={styles.slotTitle} numberOfLines={1}>Cữ Trưa (11:30 - 13:00)</Text>
                  <Text style={styles.slotSub} numberOfLines={1}>Uống sau bữa cơm trưa</Text>
                </View>
              </View>

              <View style={styles.slotHeaderBottom}>
                <View style={[styles.statusTag, { backgroundColor: noonStatus.bg, borderColor: noonStatus.color }]}>
                  <Text style={[styles.statusTagText, { color: noonStatus.color }]}>
                    {noonStatus.label}
                  </Text>
                </View>
              </View>
            </View>

            {noonDoses.map((dose) => renderDoseRow(dose, toggleDose, handleDeleteDose))}
          </View>
        )}

        {/* Evening Dose Section */}
        {eveningDoses.length > 0 && (
          <View
            style={[
              styles.timeSlotBox,
              eveningStatus.status === 'due_now' && styles.slotBoxDueNow,
              eveningStatus.status === 'overdue' && styles.slotBoxOverdue,
            ]}
          >
            <View style={styles.slotHeader}>
              <View style={styles.slotHeaderTop}>
                <View style={[styles.slotIconBadge, { backgroundColor: Colors.primaryLight }]}>
                  <Moon size={20} color={Colors.primary} />
                </View>
                <View style={styles.slotTitleCol}>
                  <Text style={styles.slotTitle} numberOfLines={1}>Cữ Tối (19:30 - 21:00)</Text>
                  <Text style={styles.slotSub} numberOfLines={1}>Uống sau bữa tối hoặc trước khi đi ngủ</Text>
                </View>
              </View>

              <View style={styles.slotHeaderBottom}>
                <View style={[styles.statusTag, { backgroundColor: eveningStatus.bg, borderColor: eveningStatus.color }]}>
                  <Text style={[styles.statusTagText, { color: eveningStatus.color }]}>
                    {eveningStatus.label}
                  </Text>
                </View>
              </View>
            </View>

            {eveningDoses.map((dose) => renderDoseRow(dose, toggleDose, handleDeleteDose))}
          </View>
        )}

        {/* Empty state fallback */}
        {doses.length === 0 && (
          <View style={styles.emptyCard}>
            <Pill size={40} color={Colors.primary} />
            <Text style={styles.emptyTitle}>Chưa có lịch uống thuốc</Text>
            <Text style={styles.emptyDesc}>
              Bác có thể tự thêm thuốc thủ công hoặc chụp đơn thuốc ở tab "Quét phiếu" để AI tự động trích xuất.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              <TouchableOpacity
                style={styles.addMedBtnSmall}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addMedBtnText}>Thêm thuốc mới</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanPrescriptionBtn}
                onPress={() => router.push('/scan' as any)}
              >
                <Camera size={18} color={Colors.primaryDark} />
                <Text style={styles.scanPrescriptionBtnText}>Quét đơn thuốc</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Prescription scan hint */}
        <View style={styles.hintCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#0369A1" />
            <Text style={styles.hintTitle}>Tự Động Đồng Bộ & Nhắc Nhở Thông Minh</Text>
          </View>
          <Text style={styles.hintText}>
            Hệ thống tự động theo dõi đồng hồ điện thoại của bác. Khi đến các mốc giờ uống thuốc sáng, trưa hoặc tối, ứng dụng sẽ hiện thông báo và phát giọng nói nhắc nhở để bác không bao giờ quên uống thuốc.
          </Text>
        </View>
      </ScrollView>

      {/* MANUAL ADD MEDICATION MODAL */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.addModalContainer}>
            {/* Header */}
            <View style={styles.addModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.addModalIconWrap}>
                  <Pill size={18} color={Colors.primary} />
                </View>
                <Text style={styles.addModalTitle}>Thêm Thuốc Thủ Công</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeModalBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 12 }}>
              {/* Field 1: Medicine Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tên thuốc hoặc loại thuốc *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Panadol 500mg, Amlodipine..."
                  placeholderTextColor="#9CA3AF"
                  value={newMedName}
                  onChangeText={setNewMedName}
                />
              </View>

              {/* Field 2: Dosage */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Liều lượng mỗi lần uống</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: 1 viên, 2 viên, 1 gói..."
                  placeholderTextColor="#9CA3AF"
                  value={newMedDosage}
                  onChangeText={setNewMedDosage}
                />
                {/* Quick Dosage Chips */}
                <View style={styles.quickChipsRow}>
                  {['1 viên', '2 viên', '1/2 viên', '1 gói'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.quickChip, newMedDosage === d && styles.quickChipActive]}
                      onPress={() => setNewMedDosage(d)}
                    >
                      <Text style={[styles.quickChipText, newMedDosage === d && styles.quickChipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Field 3: Time Slot */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Uống vào cữ nào trong ngày? *</Text>
                <View style={styles.slotPickerCol}>
                  <TouchableOpacity
                    style={[styles.slotOption, newMedSlot === 'morning' && styles.slotOptionActive]}
                    onPress={() => setNewMedSlot('morning')}
                    activeOpacity={0.8}
                  >
                    <Sun size={18} color={newMedSlot === 'morning' ? '#D97706' : '#9CA3AF'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.slotOptionTitle, newMedSlot === 'morning' && styles.slotOptionTitleActive]}>
                        Cữ Sáng (07:00 - 08:30)
                      </Text>
                      <Text style={styles.slotOptionDesc}>Uống sau khi ăn sáng no</Text>
                    </View>
                    {newMedSlot === 'morning' && <CheckCircle2 size={18} color={Colors.primary} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.slotOption, newMedSlot === 'noon' && styles.slotOptionActive]}
                    onPress={() => setNewMedSlot('noon')}
                    activeOpacity={0.8}
                  >
                    <Sunset size={18} color={newMedSlot === 'noon' ? '#EA580C' : '#9CA3AF'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.slotOptionTitle, newMedSlot === 'noon' && styles.slotOptionTitleActive]}>
                        Cữ Trưa (11:30 - 13:00)
                      </Text>
                      <Text style={styles.slotOptionDesc}>Uống sau bữa cơm trưa</Text>
                    </View>
                    {newMedSlot === 'noon' && <CheckCircle2 size={18} color={Colors.primary} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.slotOption, newMedSlot === 'evening' && styles.slotOptionActive]}
                    onPress={() => setNewMedSlot('evening')}
                    activeOpacity={0.8}
                  >
                    <Moon size={18} color={newMedSlot === 'evening' ? Colors.primary : '#9CA3AF'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.slotOptionTitle, newMedSlot === 'evening' && styles.slotOptionTitleActive]}>
                        Cữ Tối (19:30 - 21:00)
                      </Text>
                      <Text style={styles.slotOptionDesc}>Uống sau ăn tối hoặc trước khi ngủ</Text>
                    </View>
                    {newMedSlot === 'evening' && <CheckCircle2 size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Field 4: Instructions */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hướng dẫn cách uống</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Ví dụ: Uống sau khi ăn no kèm nhiều nước ấm..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={newMedInstructions}
                  onChangeText={setNewMedInstructions}
                />
                {/* Quick Instruction Chips */}
                <View style={styles.quickChipsWrap}>
                  {[
                    'Uống sau khi ăn no',
                    'Uống trước ăn 30 phút',
                    'Uống trước khi đi ngủ',
                    'Uống cùng nhiều nước ấm',
                  ].map((inst) => (
                    <TouchableOpacity
                      key={inst}
                      style={[styles.quickChip, newMedInstructions === inst && styles.quickChipActive]}
                      onPress={() => setNewMedInstructions(inst)}
                    >
                      <Text style={[styles.quickChipText, newMedInstructions === inst && styles.quickChipTextActive]}>
                        {inst}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Submit / Cancel Buttons */}
            <View style={styles.addModalActions}>
              <TouchableOpacity
                style={styles.addModalSubmitBtn}
                onPress={handleAddMedication}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={20} color="#FFFFFF" />
                <Text style={styles.addModalSubmitBtnText}>Lưu Vào Lịch Uống</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addModalCancelBtn}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.addModalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ON-SCREEN ALARM REMINDER MODAL */}
      <Modal visible={showAlarmModal} animationType="fade" transparent>
        <View style={styles.alarmModalOverlay}>
          <View style={styles.alarmModalBox}>
            {/* Header with Ringing Bell */}
            <View style={styles.alarmHeader}>
              <View style={styles.alarmBellCircle}>
                <BellRing size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.alarmTitle}>ĐÃ ĐẾN GIỜ UỐNG THUỐC!</Text>
              <Text style={styles.alarmSubtitle}>
                Bây giờ là {timeString} — Cữ{' '}
                {alarmSlot === 'morning' ? 'Sáng' : alarmSlot === 'noon' ? 'Trưa' : 'Tối'}
              </Text>
            </View>

            {/* List of Medicines Due */}
            <ScrollView style={{ maxHeight: 240, width: '100%', marginVertical: 12 }}>
              <View style={{ gap: 8 }}>
                {doses
                  .filter((d) => d.timeSlot === alarmSlot)
                  .map((dose, idx) => (
                    <View key={dose.id} style={styles.alarmMedItem}>
                      <View style={styles.alarmMedNum}>
                        <Text style={styles.alarmMedNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alarmMedName} numberOfLines={1}>{dose.name}</Text>
                        <Text style={styles.alarmMedInstruction} numberOfLines={1}>
                          {dose.dosage} • {dose.instructions}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity
                style={styles.alarmConfirmBtn}
                onPress={() => markAllInSlotTaken(alarmSlot)}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={22} color="#FFFFFF" />
                <Text style={styles.alarmConfirmBtnText}>TÔI ĐÃ UỐNG XONG TẤT CẢ</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={styles.alarmVoiceBtn}
                  onPress={() => {
                    const slotName =
                      alarmSlot === 'morning' ? 'Cữ Sáng' : alarmSlot === 'noon' ? 'Cữ Trưa' : 'Cữ Tối';
                    const targetDoses = doses.filter((d) => d.timeSlot === alarmSlot);
                    const medNames = targetDoses.map((d) => `${d.name}, ${d.dosage}`).join('. ');
                    speechService.speak(
                      `Bác ơi! Đã đến giờ uống thuốc ${slotName}. Thuốc gồm: ${medNames}. Bác uống ngay nhé!`
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Volume2 size={17} color={Colors.primary} />
                  <Text style={styles.alarmVoiceBtnText}>Đọc Lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alarmSnoozeBtn}
                  onPress={() => setShowAlarmModal(false)}
                  activeOpacity={0.8}
                >
                  <Clock size={17} color={Colors.textMuted} />
                  <Text style={styles.alarmSnoozeBtnText}>Nhắc sau</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function renderDoseRow(
  dose: DoseItem,
  onToggle: (id: string) => void,
  onDelete: (id: string, name: string) => void
) {
  return (
    <View
      key={dose.id}
      style={[styles.doseCard, dose.taken && styles.doseCardTaken]}
    >
      <TouchableOpacity
        style={[styles.checkbox, dose.taken && styles.checkboxTaken]}
        onPress={() => onToggle(dose.id)}
        activeOpacity={0.7}
      >
        {dose.taken && <Check size={16} color="#FFFFFF" />}
      </TouchableOpacity>

      <TouchableOpacity
        style={{ flex: 1, paddingVertical: 2 }}
        onPress={() => onToggle(dose.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pillName, dose.taken && styles.textMuted]} numberOfLines={1}>{dose.name}</Text>
        <Text style={styles.doseInfo} numberOfLines={1}>
          {dose.dosage} • {dose.instructions}
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TTSButton
          text={`${dose.name}, liều dùng ${dose.dosage}. ${dose.instructions}.`}
          label="Nghe"
          compact
        />
        <TouchableOpacity
          style={styles.deleteDoseBtn}
          onPress={() => onDelete(dose.id, dose.name)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
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
    gap: 14,
  },
  realtimeBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  realtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  clockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  clockText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  testAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  testAlarmBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  realtimeSub: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  progressSub: {
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  progressBadge: {
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.primaryPale,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  addMedBtn: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    minHeight: 46,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addMedBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addMedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryPale,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    minHeight: 46,
  },
  clearAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  scanPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  scanPrescriptionBtnText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  timeSlotBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
    overflow: 'hidden',
  },
  slotBoxDueNow: {
    borderColor: '#C2410C',
    backgroundColor: '#FFFAF5',
    borderWidth: 1.5,
  },
  slotBoxOverdue: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
  },
  slotHeader: {
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  slotHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  slotTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  slotTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    lineHeight: 20,
  },
  slotSub: {
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  slotHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTag: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusTagText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 54,
  },
  doseCardTaken: {
    backgroundColor: '#F9FAFB',
    opacity: 0.75,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  checkboxTaken: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.textMain,
  },
  textMuted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  doseInfo: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  deleteDoseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
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
  restoreBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  restoreBtnText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  hintCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
  },
  hintText: {
    fontSize: 12.5,
    color: '#0C4A6E',
    lineHeight: 18,
  },

  // Manual Add Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 63, 70, 0.65)',
    justifyContent: 'flex-end',
  },
  addModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addModalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  closeModalBtn: {
    padding: 4,
  },
  formGroup: {
    gap: 5,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textMain,
    backgroundColor: '#F8FAFA',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 5,
  },
  quickChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  quickChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  slotPickerCol: {
    gap: 7,
  },
  slotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFA',
  },
  slotOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  slotOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  slotOptionTitleActive: {
    color: Colors.primaryDark,
  },
  slotOptionDesc: {
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 1,
  },
  addModalActions: {
    gap: 8,
    marginTop: 12,
    paddingBottom: 8,
  },
  addModalSubmitBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  addModalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addModalCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  addModalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // Alarm Reminder Modal Styles
  alarmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 63, 70, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alarmModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  alarmHeader: {
    alignItems: 'center',
    gap: 6,
  },
  alarmBellCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  alarmTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primaryDark,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  alarmSubtitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  alarmMedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFA',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alarmMedNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmMedNumText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  alarmMedName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  alarmMedInstruction: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  alarmConfirmBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 48,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  alarmConfirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alarmVoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.primaryPale,
    borderRadius: 12,
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alarmVoiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  alarmSnoozeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alarmSnoozeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
