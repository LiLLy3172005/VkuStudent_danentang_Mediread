'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, Volume2, Type, Sliders, User, ShieldCheck } from 'lucide-react';
import { useElderlyPreferences } from '../../components/ElderlyPreferencesContext';
import { TTSPlayer } from '../../components/Footer';
import { api } from '../../lib/api';

export default function SettingsPage() {
  const { fontScale, setFontScale, ttsRate, setTtsRate } = useElderlyPreferences();

  const speechText =
    'Tại đây bác có thể điều chỉnh chữ to hơn, chỉnh giọng nói đọc chậm hơn để nghe rõ ràng nhất.';

  const user = api.getCurrentUser();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Cài Đặt & Trợ Năng</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Tùy chỉnh cỡ chữ và giọng đọc phù hợp nhất với mắt và tai của người cao tuổi
          </p>
        </div>
        <TTSPlayer text={speechText} label="Nghe hướng dẫn" />
      </div>

      {/* Font Scale Settings */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
        <div className="flex items-center gap-3 text-xl font-black text-[#073F46]">
          <Type className="w-6 h-6 text-[#0B6B73]" />
          <h2>1. Cỡ chữ trên toàn bộ ứng dụng</h2>
        </div>
        <p className="text-sm text-[#5B6B77]">
          Bác có thể phóng to chữ để đọc kết quả xét nghiệm và hướng dẫn dùng thuốc dễ dàng hơn.
        </p>

        <div className="grid grid-cols-3 gap-4 pt-2">
          {[
            { label: 'Chuẩn (100%)', val: 1.0 },
            { label: 'To rõ (125%)', val: 1.25 },
            { label: 'Rất to (145%)', val: 1.45 },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setFontScale(item.val)}
              className={`p-4 rounded-2xl border-2 font-bold text-center transition elderly-tap-target ${
                Math.abs(fontScale - item.val) < 0.05
                  ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46] font-black shadow-sm'
                  : 'border-gray-200 text-gray-700 hover:border-[#0B6B73]/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TTS Speech Rate Settings */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
        <div className="flex items-center gap-3 text-xl font-black text-[#073F46]">
          <Volume2 className="w-6 h-6 text-[#0B6B73]" />
          <h2>2. Tốc độ đọc giọng nói tiếng Việt</h2>
        </div>
        <p className="text-sm text-[#5B6B77]">
          Người cao tuổi thường nghe rõ hơn khi trợ lý đọc chậm rãi, rõ từng từ ngữ y khoa.
        </p>

        <div className="grid grid-cols-3 gap-4 pt-2">
          {[
            { label: 'Chậm rãi (0.75x)', val: 0.75 },
            { label: 'Vừa phải (0.85x)', val: 0.85 },
            { label: 'Bình thường (1.0x)', val: 1.0 },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setTtsRate(item.val)}
              className={`p-4 rounded-2xl border-2 font-bold text-center transition elderly-tap-target ${
                Math.abs(ttsRate - item.val) < 0.05
                  ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46] font-black shadow-sm'
                  : 'border-gray-200 text-gray-700 hover:border-[#0B6B73]/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Profile Summary */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xl font-black text-[#073F46]">
            <User className="w-6 h-6 text-[#0B6B73]" />
            <h2>3. Thông tin tài khoản người dùng</h2>
          </div>
          <Link
            href="/login"
            className="text-sm font-bold text-[#0B6B73] hover:underline"
          >
            Đổi tài khoản
          </Link>
        </div>

        {user ? (
          <div className="space-y-3 divide-y divide-gray-100 text-base">
            <div className="flex justify-between py-2">
              <span className="text-[#5B6B77]">Họ và tên:</span>
              <span className="font-extrabold text-[#073F46]">
                {user.full_name}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5B6B77]">Năm sinh:</span>
              <span className="font-bold">
                {user.birth_year ? `${user.birth_year} (${new Date().getFullYear() - user.birth_year} tuổi)` : 'Chưa cập nhật'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5B6B77]">Giới tính:</span>
              <span className="font-bold uppercase">
                {user.sex === 'nu' ? 'Nữ' : user.sex === 'nam' ? 'Nam' : user.sex || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5B6B77]">Vai trò tài khoản:</span>
              <span className="font-bold text-[#0B6B73]">
                {user.role === 'caregiver' ? 'Người thân chăm sóc' : 'Người bệnh (Chính chủ)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-2xl text-center text-sm text-gray-500 font-semibold space-y-2">
            <p>Bác/Bạn chưa đăng nhập tài khoản.</p>
            <Link
              href="/login"
              className="inline-block bg-[#0B6B73] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#073F46]"
            >
              Đăng nhập / Chọn tài khoản ngay
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
