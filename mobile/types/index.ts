export interface Profile {
  id: string;
  full_name: string;
  sex?: 'nam' | 'nu' | 'other';
  birth_year?: number;
  role: 'patient' | 'caregiver';
  timezone?: string;
  preferences?: {
    font_scale?: number;
    tts_rate?: number;
    tts_enabled?: boolean;
    voice_region?: 'north' | 'south';
  };
}

export interface LabResultItem {
  id?: string;
  name: string;
  normalized_code?: string;
  value_num?: number | null;
  value_text?: string | null;
  value_raw?: string | null;
  unit?: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
  ref_text?: string | null;
  flag?: 'H' | 'L' | 'N' | 'high' | 'low' | 'normal' | null;
  flag_note?: string | null;
}

export interface ExplanationItem {
  id?: string;
  indicator_name?: string;
  explanation?: string;
  content?: string;
  citations?: Array<{ title?: string; excerpt?: string; relevance_score?: number }>;
  disclaimer?: string;
  refused?: boolean;
}

export interface MedicationItem {
  id?: string;
  name: string;
  dosage?: string;
  dosage_form?: string;
  times_per_day?: number;
  times?: string[];
  instructions?: string;
  duration_days?: number;
  active?: boolean;
}

export interface DocumentDetail {
  id: string;
  user_id: string;
  doc_type: 'lab_report' | 'prescription';
  status: 'uploaded' | 'processing' | 'needs_review' | 'confirmed' | 'rejected';
  storage_path: string;
  facility_name?: string;
  issued_date?: string;
  ocr_confidence?: number;
  ocr_text?: string;
  is_pii_masked: boolean;
  lab_results: LabResultItem[];
  medications: MedicationItem[];
  explanations: ExplanationItem[];
  created_at: string;
}

export interface DocumentSummary {
  id: string;
  doc_type: 'lab_report' | 'prescription';
  status: string;
  facility_name?: string;
  issued_date?: string;
  created_at: string;
}

export interface CareLink {
  id: string;
  patient_id: string;
  caregiver_id: string;
  status: 'pending' | 'accepted' | 'revoked';
  patient_name?: string;
  caregiver_name?: string;
  created_at: string;
}
