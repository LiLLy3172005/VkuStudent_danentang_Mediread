import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { DocumentDetail, DocumentSummary, Profile, CareLink } from '../types';

const TOKEN_KEY = 'mediread_auth_token';

// Default LAN IP for physical device / emulator access to FastAPI
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.16.0.2:8000';

class ApiService {
  private baseUrl: string = DEFAULT_API_URL;
  private cachedToken: string | null = null;

  constructor() {
    this.initToken();
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
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
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
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

  async login(payload: { user_id?: string; phone?: string }): Promise<{ access_token: string; profile: Profile }> {
    const res = await this.request<{ access_token: string; profile: Profile }>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      await this.setToken(res.access_token);
    }
    return res;
  }

  async register(payload: { full_name: string; phone?: string; birth_year?: number; sex?: string; role?: string }): Promise<{ access_token: string; profile: Profile }> {
    const res = await this.request<{ access_token: string; profile: Profile }>('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      await this.setToken(res.access_token);
    }
    return res;
  }

  async getMe(): Promise<Profile> {
    return this.request<Profile>('/api/v1/auth/me');
  }

  // Documents Endpoints
  async listDocuments(): Promise<DocumentSummary[]> {
    return this.request<DocumentSummary[]>('/api/v1/documents');
  }

  async getDocument(id: string): Promise<DocumentDetail> {
    return this.request<DocumentDetail>(`/api/v1/documents/${id}`);
  }

  async uploadDocument(fileUri: string, fileName: string, docType: 'lab_report' | 'prescription' = 'lab_report'): Promise<{ document_id: string; status: string; message: string }> {
    const formData = new FormData();
    const type = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // React Native FormData file object format
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: type,
    } as any);
    formData.append('doc_type', docType);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.cachedToken) {
      headers['Authorization'] = `Bearer ${this.cachedToken}`;
    }

    const res = await fetch(`${this.baseUrl}/api/v1/documents/upload`, {
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

  async confirmDocument(id: string, confirmedData: any): Promise<any> {
    return this.request(`/api/v1/documents/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed_data: confirmedData }),
    });
  }

  // Trends
  async getTrends(code: string = 'GLU'): Promise<any[]> {
    try {
      return await this.request<any[]>(`/api/v1/medical/trends?indicator_code=${code}`);
    } catch {
      return [];
    }
  }

  // Care Links
  async getCareLinks(): Promise<CareLink[]> {
    try {
      return await this.request<CareLink[]>('/api/v1/care-links');
    } catch {
      return [];
    }
  }
}

export const api = new ApiService();
