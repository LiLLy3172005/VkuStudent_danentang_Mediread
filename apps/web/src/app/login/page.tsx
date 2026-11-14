'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse, Lock, Phone, UserCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { TTSPlayer } from '../../components/Footer';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      alert('Vui lòng nhập số điện thoại hoặc email.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('mediread_jwt_token', 'demo_jwt_token_elderly_patient');
      router.push('/');
    }, 600);
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white flex items-center justify-center mx-auto text-3xl shadow-lg">
          <HeartPulse className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-black text-[#073F46]">Đăng Nhập MediRead AI</h1>
        <p className="text-sm text-[#5B6B77]">
          Dành riêng cho người cao tuổi và người thân chăm sóc gia đình
        </p>
      </div>

      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-8 shadow-card space-y-6">
        {step === 'input' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label className="block text-base font-bold text-[#073F46] mb-2">
                1. Bác là ai trong hệ thống?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition elderly-tap-target ${
                    role === 'patient'
                      ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Bệnh nhân
                </button>
                <button
                  type="button"
                  onClick={() => setRole('caregiver')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition elderly-tap-target ${
                    role === 'caregiver'
                      ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Người chăm sóc
                </button>
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-[#073F46] mb-2">
                2. Số điện thoại của bác:
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl pl-12 pr-4 py-3.5 text-lg font-bold text-[#14283A] focus:outline-none focus:border-[#0B6B73]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-[#0B6B73] hover:bg-[#073F46] text-white font-black text-lg shadow-button transition flex items-center justify-center gap-2 elderly-tap-target"
            >
              <span>{loading ? 'Đang gửi mã...' : 'Nhận mã OTP qua tin nhắn'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#073F46]">Nhập 6 số mã xác nhận</h3>
              <p className="text-sm text-[#5B6B77]">Mã OTP đã được gửi đến số {phone}</p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                placeholder="1 2 3 4 5 6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center tracking-widest text-3xl font-black bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-2xl py-4 text-[#073F46] focus:outline-none focus:border-[#0B6B73]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-[#0B6B73] hover:bg-[#073F46] text-white font-black text-lg shadow-button transition flex items-center justify-center gap-2 elderly-tap-target"
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào ứng dụng'}</span>
              <UserCheck className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
