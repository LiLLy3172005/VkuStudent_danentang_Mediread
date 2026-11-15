import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import { Pill, Check, Clock, Sun, Sunset, Moon, Plus } from 'lucide-react-native';

interface DoseItem {
  id: string;
  name: string;
  dosage: string;
  timeSlot: 'morning' | 'noon' | 'evening';
  instructions: string;
  taken: boolean;
}

export default function MedicationScreen() {
  const [doses, setDoses] = useState<DoseItem[]>([
    {
      id: '1',
      name: 'Metformin 500mg',
      dosage: '1 viên',
      timeSlot: 'morning',
      instructions: 'Uống ngay sau khi ăn sáng',
      taken: true,
    },
    {
      id: '2',
      name: 'Amlodipine 5mg',
      dosage: '1 viên',
      timeSlot: 'morning',
      instructions: 'Uống định kỳ vào buổi sáng để kiểm soát huyết áp',
      taken: true,
    },
    {
      id: '3',
      name: 'Atorvastatin 20mg',
      dosage: '1 viên',
      timeSlot: 'evening',
      instructions: 'Uống trước khi đi ngủ 30 phút để giảm mỡ máu',
      taken: false,
    },
  ]);

  const toggleDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, taken: !d.taken } : d))
    );
  };

  const morningDoses = doses.filter((d) => d.timeSlot === 'morning');
  const eveningDoses = doses.filter((d) => d.timeSlot === 'evening');

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Lịch Uống Thuốc" subtitle="Theo dõi và đánh dấu các cữ thuốc trong ngày" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Morning Dose Section */}
        <View style={styles.timeSlotBox}>
          <View style={styles.slotHeader}>
            <View style={[styles.slotIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Sun size={20} color="#D97706" />
            </View>
            <View>
              <Text style={styles.slotTitle}>Cữ Sáng (07:00 - 08:30)</Text>
              <Text style={styles.slotSub}>Uống sau khi ăn sáng no</Text>
            </View>
          </View>

          {morningDoses.map((dose) => (
            <TouchableOpacity
              key={dose.id}
              style={[styles.doseCard, dose.taken && styles.doseCardTaken]}
              onPress={() => toggleDose(dose.id)}
              activeOpacity={0.8}
            >
              <TouchableOpacity
                style={[styles.checkbox, dose.taken && styles.checkboxTaken]}
                onPress={() => toggleDose(dose.id)}
              >
                {dose.taken && <Check size={16} color="#FFFFFF" />}
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={[styles.pillName, dose.taken && styles.textMuted]}>
                  {dose.name}
                </Text>
                <Text style={styles.doseInfo}>{dose.dosage} • {dose.instructions}</Text>
              </View>

              <TTSButton
                text={`${dose.name}, liều dùng ${dose.dosage}. ${dose.instructions}.`}
                label="Nghe"
                compact
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Evening Dose Section */}
        <View style={styles.timeSlotBox}>
          <View style={styles.slotHeader}>
            <View style={[styles.slotIconBadge, { backgroundColor: '#EDE9FE' }]}>
              <Moon size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.slotTitle}>Cữ Tối (19:30 - 21:00)</Text>
              <Text style={styles.slotSub}>Uống trước khi đi ngủ</Text>
            </View>
          </View>

          {eveningDoses.map((dose) => (
            <TouchableOpacity
              key={dose.id}
              style={[styles.doseCard, dose.taken && styles.doseCardTaken]}
              onPress={() => toggleDose(dose.id)}
              activeOpacity={0.8}
            >
              <TouchableOpacity
                style={[styles.checkbox, dose.taken && styles.checkboxTaken]}
                onPress={() => toggleDose(dose.id)}
              >
                {dose.taken && <Check size={16} color="#FFFFFF" />}
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={[styles.pillName, dose.taken && styles.textMuted]}>
                  {dose.name}
                </Text>
                <Text style={styles.doseInfo}>{dose.dosage} • {dose.instructions}</Text>
              </View>

              <TTSButton
                text={`${dose.name}, liều dùng ${dose.dosage}. ${dose.instructions}.`}
                label="Nghe"
                compact
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Prescription scan hint */}
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Bác có đơn thuốc mới?</Text>
          <Text style={styles.hintText}>
            Bác hãy chụp đơn thuốc ở tab "Quét phiếu", hệ thống sẽ tự động thêm thuốc và đặt lịch nhắc nhở vào đây nhé.
          </Text>
        </View>
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
    gap: 16,
  },
  timeSlotBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 6,
  },
  slotIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  slotSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doseCardTaken: {
    backgroundColor: '#F9FAFB',
    opacity: 0.75,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxTaken: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  textMuted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  doseInfo: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  hintCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
  },
  hintTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369A1',
  },
  hintText: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
  },
});
