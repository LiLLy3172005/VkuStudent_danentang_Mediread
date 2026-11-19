export type DocType = 'prescription' | 'lab_report';
export type DocStatus = 'uploaded' | 'processing' | 'needs_review' | 'confirmed' | 'rejected';
export type LabFlag = 'H' | 'L' | 'N' | 'UNKNOWN' | 'high' | 'low' | 'normal' | 'unknown';

export interface DocumentSummary {
  id: string;
  user_id: string;
  doc_type: DocType;
  status: DocStatus;
  facility_name?: string;
  issued_date?: string;
  ocr_confidence?: number;
  is_pii_masked: boolean;
  created_at: string;
}

export interface LabResultItem {
  id?: string;
  name: string;
  normalized_code?: string;
  value_num?: number | null;
  value_raw?: string | null;
  value_text?: string | null;
  value?: string | number | null;
  unit?: string | null;
  unit_normalized?: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
  ref_text?: string | null;
  reference_range_raw?: string | null;
  reference_range_used?: string | null;
  reference_source?: string | null;
  flag?: 'high' | 'low' | 'normal' | 'unknown' | 'H' | 'L' | 'N' | 'UNKNOWN' | string | null;
  flag_note?: string;
  quality_status?: string;
  review_reason?: string;
}

export interface MedicationItem {
  id?: string;
  name: string;
  dosage?: string | null;
  dosage_form?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  times_per_day?: number | null;
  instructions?: string | null;
  active?: boolean;
  morning?: string | null;
  noon?: string | null;
  evening?: string | null;
  notes?: string | null;
}

export interface ExplanationItem {
  indicator_name: string;
  explanation: string;
  citations: Array<{ title: string; relevance_score?: number; excerpt?: string }>;
  disclaimer: string;
  flag?: string;
}

export interface DocumentDetail {
  id: string;
  user_id: string;
  doc_type: DocType;
  status: DocStatus;
  storage_path?: string;
  signed_image_url?: string;
  is_pii_masked: boolean;
  facility_name?: string;
  issued_date?: string;
  diagnosis?: string;
  doctor_name?: string;
  ocr_engine?: string;
  ocr_text?: string;
  ocr_confidence?: number;
  lab_results: LabResultItem[];
  medications: MedicationItem[];
  explanations: ExplanationItem[];
  is_confirmed: boolean;
  created_at: string;
}

export interface CareLink {
  id: string;
  patient_id: string;
  patient_name?: string;
  caregiver_id: string;
  caregiver_name?: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
}

export interface ElderlyPreferences {
  fontScale: number; // 1.0, 1.25, 1.45
  ttsRate: number;   // 0.8 default
  ttsEnabled: boolean;
  highContrast: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'patient' | 'caregiver';
  email?: string;
  phone?: string;
  sex?: 'nam' | 'nu' | 'other';
  birth_year?: number;
}

export interface AccountSummary {
  id: string;
  full_name: string;
  role: 'patient' | 'caregiver';
  sex?: string;
  birth_year?: number;
  email?: string;
}

export interface ScheduleItem {
  id: string;
  name: string;
  slotKey: 'morning' | 'noon' | 'evening';
  slotName: string;
  time: string;
  dosage: string;
  instructions: string;
  status: 'pending' | 'taken' | 'skipped';
  updatedAt?: string;
}
