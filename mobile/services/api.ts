import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { DocumentDetail, DocumentSummary, Profile, CareLink } from '../types';

const TOKEN_KEY = 'mediread_auth_token';
const SERVER_URL_KEY = 'mediread_server_url';

// Default Public Cloud URL for APK builds (fallback to Permanent Static Ngrok URL)
export const DEFAULT_API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://supersulfureted-superciliously-kasen.ngrok-free.dev'
).trim().replace(/\/+$/, '');

class ApiService {
  private baseUrl: string = DEFAULT_API_URL;
  private cachedToken: string | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await Promise.all([this.initUrl(), this.initToken()]);
  }

  async initUrl(): Promise<string> {
    try {
      if (Platform.OS !== 'web') {
        const savedUrl = await SecureStore.getItemAsync(SERVER_URL_KEY);
        if (savedUrl && savedUrl.startsWith('http')) {
          this.baseUrl = savedUrl.replace(/\/+$/, '');
        }
      }
    } catch {
      // ignore
    }
    return this.baseUrl;
  }

  async setBaseUrl(url: string) {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    this.baseUrl = cleanUrl;
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(SERVER_URL_KEY, cleanUrl);
      }
    } catch (e) {
      console.warn('SecureStore server url error:', e);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async testConnection(targetUrl?: string): Promise<{ success: boolean; message: string; count?: number }> {
    const url = (targetUrl || this.baseUrl).replace(/\/+$/, '') + '/api/v1/auth/accounts';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: `Kết nối thành công! Đã tìm thấy ${Array.isArray(data) ? data.length : 0} hồ sơ.`, count: data.length };
      }
      return { success: false, message: `Máy chủ phản hồi mã lỗi HTTP ${res.status}` };
    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        return { success: false, message: 'Hết thời gian chờ (Timeout 4s). Kiểm tra lại kết nối mạng.' };
      }
      return { success: false, message: e.message || 'Không thể kết nối đến máy chủ.' };
    }
  }

  async initToken(): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        this.cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch {
      this.cachedToken = null;
    }
    return this.cachedToken;
  }

  async setToken(token: string) {
    this.cachedToken = token;
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
  }

  async clearToken() {
    this.cachedToken = null;
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
  }

  getToken(): string | null {
    return this.cachedToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.cachedToken) {
      await this.initToken();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': '69420',
      ...(options.headers as Record<string, string>),
    };

    if (this.cachedToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.cachedToken}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.detail || errorJson.message || errorMsg;
      } catch {
        // ignore JSON parse fail
      }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Auth Endpoints
  async getAccounts(): Promise<Profile[]> {
    return this.request<Profile[]>('/api/v1/auth/accounts');
  }

  async login(payload: { user_id?: string; phone?: string; password?: string }): Promise<{ access_token: string; profile: Profile }> {
    const res = await this.request<any>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      await this.setToken(res.access_token);
    }
    return {
      access_token: res.access_token,
      profile: res.profile || res.user,
    };
  }

  async register(payload: { full_name: string; phone?: string; password: string; birth_year?: number; sex?: string; role?: string }): Promise<{ access_token: string; profile: Profile }> {
    const res = await this.request<any>('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      await this.setToken(res.access_token);
    }
    return {
      access_token: res.access_token,
      profile: res.profile || res.user,
    };
  }

  async getMe(): Promise<Profile> {
    return this.request<Profile>('/api/v1/auth/me');
  }

  // Documents Endpoints
  async listDocuments(): Promise<DocumentSummary[]> {
    if (!this.cachedToken) {
      await this.initToken();
    }
    if (!this.cachedToken) {
      return [];
    }
    return this.request<DocumentSummary[]>('/api/v1/documents');
  }

  async getDocument(id: string): Promise<DocumentDetail> {
    return this.request<DocumentDetail>(`/api/v1/documents/${id}`);
  }

  async uploadDocument(fileUri: string, fileName: string, docType: 'lab_report' | 'prescription' = 'lab_report'): Promise<{ document_id: string; status: string; message: string }> {
    if (!this.cachedToken) {
      await this.initToken();
    }
    const type = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const uploadUrl = `${this.baseUrl}/api/v1/documents/upload`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.cachedToken) {
      headers['Authorization'] = `Bearer ${this.cachedToken}`;
    }

    if (Platform.OS !== 'web') {
      const res = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: type,
        parameters: {
          doc_type: docType,
        },
        headers,
      });

      if (res.status < 200 || res.status >= 300) {
        let errText = `Upload error: ${res.status}`;
        try {
          const errJson = JSON.parse(res.body);
          errText = errJson.detail || errJson.message || errText;
        } catch {}
        throw new Error(errText);
      }

      return JSON.parse(res.body);
    } else {
      const formData = new FormData();
      const fileRes = await fetch(fileUri);
      const blob = await fileRes.blob();
      formData.append('file', blob, fileName);
      formData.append('doc_type', docType);

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        let errText = `Upload error: ${res.status}`;
        try {
          const errJson = await res.json();
          errText = errJson.detail || errText;
        } catch {}
        throw new Error(errText);
      }

      return res.json();
    }
  }

  async confirmDocument(id: string, confirmedData: any): Promise<any> {
    const payload = (typeof confirmedData === 'object' && !Array.isArray(confirmedData) && confirmedData !== null)
      ? confirmedData
      : { data: confirmedData };
    return this.request(`/api/v1/documents/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed_data: payload }),
    });
  }

  // Trends
  async getLabIndicators(): Promise<Array<{
    code: string;
    name: string;
    unit: string;
    low?: number;
    high?: number;
    count: number;
    latest_value?: number;
    latest_flag?: string;
  }>> {
    try {
      const res = await this.request<any>('/api/v1/labs/indicators');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }

  async getTrends(code: string = 'GLU'): Promise<any[]> {
    try {
      const res = await this.request<any>(`/api/v1/medical/trends?indicator_code=${code}`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.history)) return res.history;
      return [];
    } catch {
      return [];
    }
  }

  // AI Doctor Consultation
  async chatDoctorAI(message: string, documentId?: string): Promise<{ reply: string; suggested_questions?: string[] }> {
    return this.request<{ reply: string; suggested_questions?: string[] }>('/api/v1/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, document_id: documentId }),
    });
  }

  // Care Links
  async getCareLinks(): Promise<CareLink[]> {
    try {
      return await this.request<CareLink[]>('/api/v1/care-links');
    } catch {
      return [];
    }
  }

  async connectCareLink(code: string): Promise<any> {
    return this.request('/api/v1/care-links/connect-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  }

  async acceptCareLink(linkId: string): Promise<any> {
    return this.request(`/api/v1/care-links/${linkId}/accept`, {
      method: 'POST',
    });
  }

  async revokeCareLink(linkId: string): Promise<any> {
    return this.request(`/api/v1/care-links/${linkId}/revoke`, {
      method: 'POST',
    });
  }

  async deleteCareLink(linkId: string): Promise<any> {
    return this.request(`/api/v1/care-links/${linkId}`, {
      method: 'DELETE',
    });
  }

  async deleteAccount(userId: string): Promise<any> {
    return this.request(`/api/v1/auth/accounts/${userId}`, {
      method: 'DELETE',
    });
  }

  async listPatientDocuments(patientId: string): Promise<DocumentSummary[]> {
    try {
      return await this.request<DocumentSummary[]>(`/api/v1/documents?patient_id=${patientId}`);
    } catch {
      return [];
    }
  }
}

export const api = new ApiService();
