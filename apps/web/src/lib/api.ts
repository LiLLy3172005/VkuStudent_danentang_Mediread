import { DocumentSummary, DocumentDetail, CareLink, UserProfile, AccountSummary, ScheduleItem, MedicationItem } from './types';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.vercel.app') || host.endsWith('.pages.dev') || host.endsWith('.netlify.app')) {
      return 'https://supersulfureted-superciliously-kasen.ngrok-free.dev';
    }
    const protocol = window.location.protocol;
    return `${protocol}//${host}:8000`;
  }
  return 'http://localhost:8000';
}

function getAuthHeader(): Record<string, string> {
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': '69420',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('mediread_jwt_token') || 'demo_token';
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

const MEDICATION_SCHEDULE_STORAGE_KEY = 'mediread_medication_schedule_v2';
const LAST_RESET_DATE_KEY = 'mediread_last_schedule_reset_date';

export const api = {
  async getAccounts(): Promise<AccountSummary[]> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/accounts`, {
      headers: {
        'ngrok-skip-browser-warning': '69420',
      },
    }).catch(() => null);
    if (!res || !res.ok) return [];
    return res.json();
  },

  async login(params: {
    user_id?: string;
    phone?: string;
    email?: string;
    password?: string;
    role?: 'patient' | 'caregiver';
  }): Promise<{ access_token: string; user: UserProfile }> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420',
      },
      body: JSON.stringify({
        user_id: params.user_id,
        phone: params.phone,
        email: params.email,
        password: params.password,
        role: params.role || 'patient',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Đăng nhập không thành công');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      if (data.access_token) {
        localStorage.setItem('mediread_jwt_token', data.access_token);
      }
      if (data.user) {
        localStorage.setItem('mediread_user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  async register(params: {
    full_name: string;
    phone?: string;
    email?: string;
    password?: string;
    role: 'patient' | 'caregiver';
    sex: 'nam' | 'nu' | 'other';
    birth_year?: number;
  }): Promise<{ access_token: string; user: UserProfile }> {
    const baseUrl = getApiBaseUrl();
    const payload = {
      ...params,
      password: params.password || '123456',
    };
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Đăng ký tài khoản thất bại');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      if (data.access_token) {
        localStorage.setItem('mediread_jwt_token', data.access_token);
      }
      if (data.user) {
        localStorage.setItem('mediread_user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('mediread_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mediread_jwt_token');
      localStorage.removeItem('mediread_user');
    }
  },

  async uploadDocument(
    file: File,
    docType: string = 'lab_report',
    patientSex: string = 'unknown',
    ageGroup: string = 'unknown'
  ): Promise<{ document_id: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('patient_sex', patientSex);
    formData.append('age_group', ageGroup);

    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/documents/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Tải ảnh lên thất bại');
    }
    return res.json();
  },

  async listDocuments(patientId?: string): Promise<DocumentSummary[]> {
    const baseUrl = getApiBaseUrl();
    const url = patientId
      ? `${baseUrl}/api/v1/documents?patient_id=${encodeURIComponent(patientId)}`
      : `${baseUrl}/api/v1/documents`;
    const res = await fetch(url, {
      headers: getAuthHeader(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getDocuments(patientId?: string): Promise<DocumentSummary[]> {
    return this.listDocuments(patientId);
  },

  async getDocumentDetail(id: string): Promise<DocumentDetail> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/documents/${id}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Không tìm thấy tài liệu');
    return res.json();
  },

  async confirmDocument(id: string, confirmedData: any): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const payload = confirmedData && typeof confirmedData === 'object' ? confirmedData : {};
    const res = await fetch(`${baseUrl}/api/v1/documents/${id}/confirm`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmed_data: payload }),
    });
    if (!res.ok) throw new Error('Xác nhận kết quả thất bại');
    return res.json();
  },

  async getLabTrends(code: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/labs/trends/${code}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) return { name: code, history: [] };
    return res.json();
  },

  async getCareLinks(): Promise<CareLink[]> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/care-links`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async connectByCode(code: string): Promise<{ success: boolean; message: string; link_id?: string; patient_name?: string }> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/care-links/connect-code`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: code.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Kết nối mã thất bại. Vui lòng kiểm tra lại mã.');
    }
    return res.json();
  },

  async requestCareLink(patientId: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/care-links/request`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patient_id: patientId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gửi yêu cầu liên kết thất bại');
    }
    return res.json();
  },

  async acceptCareLink(linkId: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/care-links/${linkId}/accept`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Chấp thuận liên kết thất bại');
    return res.json();
  },

  async revokeCareLink(linkId: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/care-links/${linkId}/revoke`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async deleteCareLink(linkId: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/care-links/${linkId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async deleteAccount(accountId: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/accounts/${accountId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async chatDoctorAI(message: string, documentId?: string): Promise<{ reply: string; suggested_questions?: string[] }> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message.trim(), document_id: documentId || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể kết nối tới Bác Sĩ AI.');
    }
    return res.json();
  },

  // --- Medication Persistent Schedule Management ---
  getMedicationSchedules(): ScheduleItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(MEDICATION_SCHEDULE_STORAGE_KEY);
      if (!raw) return [];
      const items: ScheduleItem[] = JSON.parse(raw);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },

  clearAllMedicationSchedules(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MEDICATION_SCHEDULE_STORAGE_KEY);
    }
  },

  saveMedicationSchedules(schedules: ScheduleItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MEDICATION_SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
  },

  markScheduleDose(id: string, status: 'taken' | 'skipped'): ScheduleItem[] {
    const list = this.getMedicationSchedules();
    const updated = list.map((item) =>
      item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item
    );
    this.saveMedicationSchedules(updated);
    return updated;
  },

  resetScheduleDay(): ScheduleItem[] {
    const list = this.getMedicationSchedules();
    const updated = list.map((item) => ({ ...item, status: 'pending' as const }));
    this.saveMedicationSchedules(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_RESET_DATE_KEY, new Date().toISOString().slice(0, 10));
    }
    return updated;
  },

  deleteMedicationScheduleItem(id: string): ScheduleItem[] {
    const current = this.getMedicationSchedules();
    const updated = current.filter((item) => item.id !== id);
    this.saveMedicationSchedules(updated);
    return updated;
  },

  addManualMedicationScheduleItem(item: {
    name: string;
    slotKey: 'morning' | 'noon' | 'evening';
    dosage: string;
    instructions: string;
  }): ScheduleItem {
    const current = this.getMedicationSchedules();
    const slotNames = {
      morning: 'Cữ Sáng',
      noon: 'Cữ Trưa',
      evening: 'Cữ Tối',
    };
    const slotTimes = {
      morning: '07:30',
      noon: '12:00',
      evening: '19:30',
    };
    const newItem: ScheduleItem = {
      id: 'manual-' + Date.now(),
      name: item.name.trim(),
      slotKey: item.slotKey,
      slotName: slotNames[item.slotKey],
      time: slotTimes[item.slotKey],
      dosage: item.dosage.trim() || '1 viên',
      instructions: item.instructions.trim() || 'Uống theo chỉ định của bác sĩ',
      status: 'pending',
    };
    current.push(newItem);
    this.saveMedicationSchedules(current);
    return newItem;
  },

  addMedicationsToSchedule(meds: MedicationItem[]): number {
    if (!meds || meds.length === 0) return 0;
    const current = this.getMedicationSchedules();
    let count = 0;

    for (const med of meds) {
      const name = med.name || 'Thuốc điều trị';
      const rawInst = (med.instructions || med.notes || '').toLowerCase();
      const dosage = med.dosage || (med.quantity ? `${med.quantity} ${med.unit || 'viên'}` : '1 viên');

      // Check which slots this medicine belongs to
      const slots: Array<{ key: 'morning' | 'noon' | 'evening'; name: string; time: string; note: string }> = [];

      const hasMorning = rawInst.includes('sáng') || rawInst.includes('morning') || rawInst.includes('ngày 2') || rawInst.includes('ngày 3');
      const hasNoon = rawInst.includes('trưa') || rawInst.includes('noon') || rawInst.includes('chiều') || rawInst.includes('ngày 3');
      const hasEvening = rawInst.includes('tối') || rawInst.includes('đêm') || rawInst.includes('night') || rawInst.includes('evening') || rawInst.includes('ngày 2');

      if (hasMorning) {
        slots.push({ key: 'morning', name: 'Cữ Sáng', time: '07:30', note: med.instructions || 'Uống cữ sáng' });
      }
      if (hasNoon) {
        slots.push({ key: 'noon', name: 'Cữ Trưa', time: '12:00', note: med.instructions || 'Uống cữ trưa' });
      }
      if (hasEvening) {
        slots.push({ key: 'evening', name: 'Cữ Tối', time: '19:30', note: med.instructions || 'Uống cữ tối' });
      }

      // Default to morning if no slots matched
      if (slots.length === 0) {
        slots.push({ key: 'morning', name: 'Cữ Sáng', time: '08:00', note: med.instructions || 'Uống theo đơn bác sĩ' });
      }

      for (const s of slots) {
        // avoid exact duplicate
        const exists = current.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.slotKey === s.key);
        if (!exists) {
          current.push({
            id: 'med-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            name,
            slotKey: s.key,
            slotName: s.name,
            time: s.time,
            dosage,
            instructions: s.note,
            status: 'pending',
          });
          count++;
        }
      }
    }

    if (count > 0) {
      this.saveMedicationSchedules(current);
    }
    return count;
  },
};
