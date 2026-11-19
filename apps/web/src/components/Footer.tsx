'use client';

import React from 'react';
import { Volume2, Square, AlertTriangle } from 'lucide-react';
import { useElderlyPreferences } from './ElderlyPreferencesContext';

export function TTSPlayer({ text, label = 'Nghe đọc' }: { text: string; label?: string }) {
  const { speak, stopSpeech, isSpeaking } = useElderlyPreferences();

  return (
    <button
      onClick={() => {
        if (isSpeaking) {
          stopSpeech();
        } else {
          speak(text);
        }
      }}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition shadow-sm elderly-tap-target ${
        isSpeaking
          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
          : 'bg-[#DDEEEB] text-[#073F46] hover:bg-[#cde4df] border border-[#0B6B73]/20'
      }`}
      title="Bấm để trợ lý đọc to nội dung bằng tiếng Việt"
    >
      {isSpeaking ? <Square className="w-4 h-4 text-amber-800" /> : <Volume2 className="w-4 h-4 text-[#0B6B73]" />}
      <span>{isSpeaking ? 'Dừng đọc' : label}</span>
    </button>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#DDEEEB] mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="bg-[#FDF1DC] border border-[#C2410C]/20 rounded-2xl p-4 max-w-3xl mx-auto mb-6 text-sm text-[#C2410C] font-semibold text-left flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#C2410C] mt-0.5" />
          <div>
            <strong>Lưu ý quan trọng về y tế:</strong> MediRead AI chỉ hỗ trợ số hóa và giải thích sơ bộ thông tin trên phiếu xét nghiệm hoặc đơn thuốc mang tính chất giáo dục y khoa. Mọi quyết định dùng thuốc, thay đổi liều lượng hay chẩn đoán bệnh tật bắt buộc phải do bác sĩ chuyên môn trực tiếp thăm khám chỉ định.
          </div>
        </div>
        <p className="text-sm text-[#5B6B77]">
          © 2026 MediRead AI. Hệ sinh thái đọc hiểu y khoa và chăm sóc sức khỏe tiếp cận người cao tuổi.
        </p>
      </div>
    </footer>
  );
}
