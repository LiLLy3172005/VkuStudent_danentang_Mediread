'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeartPulse,
  Phone,
  Lock,
  UserCheck,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  User,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { TTSPlayer } from '../../components/Footer';
import { api } from '../../lib/api';
import { AccountSummary } from '../../lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'patient' | 'caregiver'>('patient');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'patient' | 'caregiver'>('patient');
  const [regSex, setRegSex] = useState<'nam' | 'nu' | 'other'>('nam');
  const [regBirthYear, setRegBirthYear] = useState('1955');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadAccounts() {
      try {
        const list = await api.getAccounts();
        setAccounts(list);
      } catch (e) {
        console.warn('Could not load accounts', e);
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, []);

  // Quick 1-click login from Supabase account list
  const handleQuickLogin = async (acc: AccountSummary) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await api.login({
        user_id: acc.id,
        role: acc.role as 'patient' | 'caregiver',
      });
      router.push('/history');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Standard Phone/Identifier Login
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc email.');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      setErrorMessage('Vui lòng nhập mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await api.login({
        phone: loginPhone.trim(),
        password: loginPassword,
        role: loginRole,
      });
      router.push('/history');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  // Register New Account directly into Supabase
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bác/bạn.');
      return;
    }
    if (!regPassword || regPassword.trim().length < 6) {
      setErrorMessage('Mật khẩu bảo mật phải có tối thiểu 6 ký tự.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const year = parseInt(regBirthYear, 10);
      await api.register({
        full_name: regName.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword.trim(),
        role: regRole,
        sex: regSex,
        birth_year: isNaN(year) ? undefined : year,
      });
      alert('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      router.push('/history');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-6 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white flex items-center justify-center mx-auto text-3xl shadow-lg">
          <HeartPulse className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-black text-[#073F46]">MediRead AI</h1>
        <p className="text-base text-[#5B6B77]">
          Hệ thống số hóa & quản lý hồ sơ y tế cho người cao tuổi và gia đình
        </p>
      </div>

      {/* Mode Switch Tabs: Đăng Nhập vs Đăng Ký */}
      <div className="flex bg-[#DDEEEB] p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setErrorMessage('');
          }}
          className={`flex-1 py-3.5 rounded-xl font-bold text-base transition flex items-center justify-center gap-2 elderly-tap-target ${
            tab === 'login'
              ? 'bg-white text-[#073F46] shadow-sm'
              : 'text-[#073F46]/70 hover:text-[#073F46]'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setErrorMessage('');
          }}
          className={`flex-1 py-3.5 rounded-xl font-bold text-base transition flex items-center justify-center gap-2 elderly-tap-target ${
            tab === 'register'
              ? 'bg-white text-[#073F46] shadow-sm'
              : 'text-[#073F46]/70 hover:text-[#073F46]'
          }`}
        >
          <UserPlus className="w-5 h-5" />
          Đăng Ký Tài Khoản Mới
        </button>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: ĐĂNG NHẬP */}
      {tab === 'login' && (
        <div className="space-y-6">
          {/* Section A: Danh sách hồ sơ thực tế có sẵn trên Supabase */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#073F46] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Chọn tài khoản Supabase (Đăng nhập nhanh)
                </h2>
                <p className="text-xs text-[#5B6B77]">
                  Các tài khoản thực tế đang có sẵn trên Database của bạn
                </p>
              </div>
              <TTSPlayer text="Bác hoặc bạn có thể bấm trực tiếp vào tên tài khoản của mình bên dưới để đăng nhập ngay mà không cần mật khẩu." />
            </div>

            {loadingAccounts ? (
              <div className="py-6 text-center text-sm text-gray-500">
                Đang tải danh sách hồ sơ từ Supabase...
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                Chưa có tài khoản nào. Vui lòng bấm tab Đăng Ký để tạo hồ sơ đầu tiên!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const isPatient = acc.role === 'patient';
                  return (
                    <button
                      key={acc.id}
                      onClick={() => handleQuickLogin(acc)}
                      disabled={loading}
                      className="p-3.5 rounded-2xl border-2 border-[#DDEEEB] hover:border-[#0B6B73] hover:bg-[#F2F8F7] transition text-left flex items-start gap-3 elderly-tap-target group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${
                          isPatient ? 'bg-[#0B6B73]' : 'bg-[#D97706]'
                        }`}
                      >
                        {acc.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#14283A] group-hover:text-[#0B6B73] truncate">
                          {acc.full_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#5B6B77] mt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPatient
                                ? 'bg-[#DDEEEB] text-[#073F46]'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPatient ? 'Bệnh nhân' : 'Chăm sóc'}
                          </span>
                          {acc.birth_year && <span>SN {acc.birth_year}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Đăng nhập bằng số điện thoại */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 shadow-card space-y-5">
            <h2 className="text-lg font-black text-[#073F46]">
              Hoặc nhập số điện thoại / Email của bác:
            </h2>

            <form onSubmit={handlePhoneLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                  1. Vai trò của bác/bạn:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoginRole('patient')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition elderly-tap-target ${
                      loginRole === 'patient'
                        ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Bệnh nhân cao tuổi
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginRole('caregiver')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition elderly-tap-target ${
                      loginRole === 'caregiver'
                        ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Người chăm sóc / Con cái
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                  2. Số điện thoại hoặc Email:
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 0912 345 678 hoặc email"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                  3. Mật khẩu bảo vệ:
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0B6B73] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#073F46] transition flex items-center justify-center gap-2 shadow-md elderly-tap-target disabled:opacity-50"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN MỚI */}
      {tab === 'register' && (
        <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#073F46]">Đăng Ký Hồ Sơ Mới</h2>
              <p className="text-xs text-[#5B6B77]">
                Thông tin được lưu trữ bảo mật trên Supabase của bạn
              </p>
            </div>
            <TTSPlayer text="Bác hoặc bạn vui lòng điền họ tên, số điện thoại, năm sinh và vai trò để tạo hồ sơ sức khỏe mới." />
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* 1. Họ và tên */}
            <div>
              <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                1. Họ và tên của bác/bạn: *
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bác Trần Văn Minh"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                />
              </div>
            </div>

            {/* 2. Vai trò */}
            <div>
              <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                2. Bác/Bạn là ai? *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRegRole('patient')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition elderly-tap-target ${
                    regRole === 'patient'
                      ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Bệnh nhân cao tuổi
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('caregiver')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition elderly-tap-target ${
                    regRole === 'caregiver'
                      ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Người thân chăm sóc
                </button>
              </div>
            </div>

            {/* 3. Giới tính & Năm sinh */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                  3. Giới tính:
                </label>
                <select
                  value={regSex}
                  onChange={(e) => setRegSex(e.target.value as any)}
                  className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl px-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                >
                  <option value="nam">Nam</option>
                  <option value="nu">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                  4. Năm sinh:
                </label>
                <div className="relative">
                  <Calendar className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="1900"
                    max="2050"
                    placeholder="1955"
                    value={regBirthYear}
                    onChange={(e) => setRegBirthYear(e.target.value)}
                    className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                  />
                </div>
              </div>
            </div>

            {/* 4. Số điện thoại */}
            <div>
              <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                5. Số điện thoại (tùy chọn):
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912 345 678"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                />
              </div>
            </div>

            {/* 5. Mật khẩu bảo mật */}
            <div>
              <label className="block text-sm font-bold text-[#073F46] mb-1.5">
                6. Mật khẩu bảo mật: *
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                />
              </div>
            </div>

            {/* Nút bấm Đăng Ký */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B6B73] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#073F46] transition flex items-center justify-center gap-2 shadow-md elderly-tap-target disabled:opacity-50"
            >
              {loading ? 'Đang tạo hồ sơ...' : 'Tạo Tài Khoản & Đăng Nhập Ngay'}
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* Security notice */}
      <div className="text-center text-xs text-[#5B6B77] flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Dữ liệu y tế được bảo vệ theo tiêu chuẩn HIPAA & Row Level Security (RLS)</span>
      </div>
    </div>
  );
}
