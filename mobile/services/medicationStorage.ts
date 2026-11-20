import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface DoseItem {
  id: string;
  name: string;
  dosage: string;
  timeSlot: 'morning' | 'noon' | 'evening';
  instructions: string;
  taken: boolean;
  documentId?: string;
}

const MEDICATION_SCHEDULE_KEY = 'mediread_medication_schedule';

export const DEFAULT_DOSES: DoseItem[] = [];

export const getMedicationSchedule = async (): Promise<DoseItem[]> => {
  try {
    if (Platform.OS !== 'web') {
      const raw = await SecureStore.getItemAsync(MEDICATION_SCHEDULE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load medication schedule:', e);
  }
  return [];
};

export const clearMedicationSchedule = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(MEDICATION_SCHEDULE_KEY);
    }
  } catch (e) {
    console.warn('Failed to clear medication schedule:', e);
  }
};

export const saveMedicationSchedule = async (items: DoseItem[]): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(MEDICATION_SCHEDULE_KEY, JSON.stringify(items));
    }
  } catch (e) {
    console.warn('Failed to save medication schedule:', e);
  }
};

/**
 * Automatically converts medications from a scanned prescription into scheduled doses
 * and adds them to the daily schedule!
 */
export const addMedicationsFromPrescription = async (
  medications: Array<{
    name: string;
    dosage?: string;
    dosage_form?: string;
    instructions?: string;
    times?: string[];
  }>,
  documentId?: string
): Promise<number> => {
  if (!medications || medications.length === 0) return 0;

  const current = await getMedicationSchedule();
  // Filter out placeholder demo items if adding real prescription
  const nonDemo = current.filter((d) => !d.id.startsWith('demo-'));

  const newDoses: DoseItem[] = [];

  for (const med of medications) {
    const medName = (med.name || '').trim();
    if (!medName) continue;

    const rawInstructions = med.instructions || `${med.dosage || ''} ${med.dosage_form || 'viên'}`.trim();
    const instLower = rawInstructions.toLowerCase();

    // Determine timeslots
    const slots: Array<'morning' | 'noon' | 'evening'> = [];
    if (Array.isArray(med.times) && med.times.length > 0) {
      for (const t of med.times) {
        if (t === 'morning' && !slots.includes('morning')) slots.push('morning');
        if (t === 'noon' && !slots.includes('noon')) slots.push('noon');
        if (t === 'evening' && !slots.includes('evening')) slots.push('evening');
      }
    }

    // Infer from Vietnamese text if slots empty
    if (slots.length === 0) {
      const hasMorning = instLower.includes('sáng') || instLower.includes('sang') || instLower.includes('am');
      const hasNoon = instLower.includes('trưa') || instLower.includes('trua') || instLower.includes('chiều') || instLower.includes('chieu');
      const hasEvening = instLower.includes('tối') || instLower.includes('toi') || instLower.includes('đêm') || instLower.includes('ngủ');

      if (hasMorning) slots.push('morning');
      if (hasNoon) slots.push('noon');
      if (hasEvening) slots.push('evening');

      if (slots.length === 0) {
        // Default to morning if unspecified
        slots.push('morning');
      }
    }

    for (const slot of slots) {
      const doseId = `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const slotLabel = slot === 'morning' ? 'Cữ sáng' : slot === 'noon' ? 'Cữ trưa' : 'Cữ tối';
      newDoses.push({
        id: doseId,
        name: medName,
        dosage: med.dosage || '1 viên',
        timeSlot: slot,
        instructions: `${rawInstructions || 'Uống theo chỉ định bác sĩ'} (${slotLabel})`,
        taken: false,
        documentId,
      });
    }
  }

  // Deduplicate against existing by name and timeSlot
  const merged = [...nonDemo];
  for (const nd of newDoses) {
    const exists = merged.some(
      (m) => m.name.toLowerCase() === nd.name.toLowerCase() && m.timeSlot === nd.timeSlot
    );
    if (!exists) {
      merged.push(nd);
    }
  }

  await saveMedicationSchedule(merged);
  return newDoses.length;
};
