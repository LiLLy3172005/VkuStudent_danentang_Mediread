'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Clock, TrendingUp, ShieldCheck, HeartPulse, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { TTSPlayer } from '../components/Footer';

export default function HomePage() {
  const welcomeText = "Chào mừng bác đến với MediRead AI. Hệ thống hỗ trợ chụp và đọc to kết quả xét nghiệm, đơn thuốc, và nhắc lịch uống thuốc hàng ngày.";

  return (
    <div className="space-y-8">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-[#073F46] to-[#0B6B73] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-sm font-semibold text-emerald-100">
            <HeartPulse className="w-4 h-4 text-emerald-300" />
            <span>Trợ lý y tế thông minh & An toàn</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Đọc hiểu phiếu xét nghiệm & Đơn thuốc dễ dàng
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Chụp ảnh phiếu khám để AI bóc tách chỉ số sinh hóa, đối chiếu khoảng chuẩn, và giải thích bằng giọng nói tiếng Việt dễ hiểu.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/scan"
              className="inline-flex items-center gap-3 bg-white text-[#073F46] hover:bg-emerald-50 px-6 py-3.5 rounded-2xl font-black text-lg shadow-lg transition elderly-tap-target"
            >
              <Camera className="w-6 h-6 text-[#0B6B73]" />
              <span>Chụp / Quét phiếu ngay</span>
            </Link>

            <TTSPlayer text={welcomeText} label="Nghe hướng dẫn" />
          </div>
        </div>
      </div>

      {/* 4 Feature Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/scan"
          className="bg-white border-2 border-[#DDEEEB] hover:border-[#0B6B73] rounded-3xl p-6 transition shadow-card group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <Camera className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-[#073F46]">Quét phiếu mới</h2>
            <p className="text-[#5B6B77] text-base">
              Chụp ảnh phiếu máu, sinh hóa, hoặc đơn thuốc. Tự động che thông tin cá nhân.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[#0B6B73] font-bold pt-4 text-base">
            <span>Bắt đầu</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/medications"
          className="bg-white border-2 border-[#DDEEEB] hover:border-[#0B6B73] rounded-3xl p-6 transition shadow-card group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-[#073F46]">Lịch uống thuốc</h2>
            <p className="text-[#5B6B77] text-base">
              Theo dõi 4 cữ uống trong ngày: Sáng, Trưa, Chiều, Tối kèm âm thanh nhắc nhở.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[#0B6B73] font-bold pt-4 text-base">
            <span>Xem lịch hôm nay</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/trends"
          className="bg-white border-2 border-[#DDEEEB] hover:border-[#0B6B73] rounded-3xl p-6 transition shadow-card group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-[#073F46]">Xu hướng chỉ số</h2>
            <p className="text-[#5B6B77] text-base">
              Biểu đồ trực quan theo dõi đường huyết, mỡ máu, men gan qua các lần khám bệnh.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[#0B6B73] font-bold pt-4 text-base">
            <span>Xem biểu đồ</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/care"
          className="bg-white border-2 border-[#DDEEEB] hover:border-[#0B6B73] rounded-3xl p-6 transition shadow-card group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-[#073F46]">Người chăm sóc</h2>
            <p className="text-[#5B6B77] text-base">
              Ủy quyền cho con cháu hoặc người thân theo dõi kết quả xét nghiệm từ xa an toàn.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[#0B6B73] font-bold pt-4 text-base">
            <span>Quản lý liên kết</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* Safety & Compliance Highlight Card */}
      <div className="bg-white border border-[#DDEEEB] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#073F46] text-lg">Bảo mật thông tin người bệnh tuyệt đối</h3>
            <p className="text-[#5B6B77] text-base">
              Toàn bộ ảnh chụp được tự động che mã vạch, số CCCD, tên và lưu trữ tại vùng dữ liệu riêng tư.
            </p>
          </div>
        </div>
        <Link
          href="/scan"
          className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-6 py-3 rounded-xl font-bold transition text-base flex-shrink-0 elderly-tap-target flex items-center gap-2"
        >
          <span>Khám phá ngay</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
