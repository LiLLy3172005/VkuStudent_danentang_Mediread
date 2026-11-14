'use client';

import React, { useState } from 'react';
import { TrendingUp, AlertCircle, ArrowUpRight, Calendar, Info } from 'lucide-react';
import { TTSPlayer } from '../../components/Footer';

interface IndicatorConfig {
  code: string;
  name: string;
  unit: string;
  refLow: number;
  refHigh: number;
  data: Array<{ date: string; value: number; flag: 'normal' | 'high' | 'low' }>;
}

const INDICATORS: IndicatorConfig[] = [
  {
    code: 'GLU',
    name: 'Glucose (Đường huyết lúc đói)',
    unit: 'mmol/L',
    refLow: 3.9,
    refHigh: 6.4,
    data: [
      { date: '15/05/2026', value: 5.6, flag: 'normal' },
      { date: '20/07/2026', value: 6.2, flag: 'normal' },
      { date: '10/09/2026', value: 7.1, flag: 'high' },
      { date: '12/11/2026', value: 7.8, flag: 'high' },
    ],
  },
  {
    code: 'CHOL',
    name: 'Cholesterol toàn phần',
    unit: 'mmol/L',
    refLow: 3.9,
    refHigh: 5.2,
    data: [
      { date: '15/05/2026', value: 4.8, flag: 'normal' },
      { date: '20/07/2026', value: 5.1, flag: 'normal' },
      { date: '10/09/2026', value: 5.5, flag: 'high' },
      { date: '12/11/2026', value: 5.8, flag: 'high' },
    ],
  },
  {
    code: 'CREAT',
    name: 'Creatinin (Chức năng thận)',
    unit: 'µmol/L',
    refLow: 62,
    refHigh: 120,
    data: [
      { date: '15/05/2026', value: 95, flag: 'normal' },
      { date: '20/07/2026', value: 102, flag: 'normal' },
      { date: '10/09/2026', value: 108, flag: 'normal' },
      { date: '12/11/2026', value: 115, flag: 'normal' },
    ],
  },
  {
    code: 'URIC',
    name: 'Acid uric máu',
    unit: 'µmol/L',
    refLow: 180,
    refHigh: 420,
    data: [
      { date: '15/05/2026', value: 380, flag: 'normal' },
      { date: '20/07/2026', value: 410, flag: 'normal' },
      { date: '10/09/2026', value: 430, flag: 'high' },
      { date: '12/11/2026', value: 450, flag: 'high' },
    ],
  },
];

export default function TrendsPage() {
  const [selectedCode, setSelectedCode] = useState('GLU');
  const activeIndicator = INDICATORS.find((i) => i.code === selectedCode) || INDICATORS[0];

  const speechSummary = `Biểu đồ theo dõi chỉ số ${activeIndicator.name}. Lần đo gần nhất ngày ${
    activeIndicator.data[activeIndicator.data.length - 1].date
  } là ${activeIndicator.data[activeIndicator.data.length - 1].value} ${activeIndicator.unit}.`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Xu Hướng Chỉ Số Sức Khỏe</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Biểu đồ trực quan theo dõi diễn biến các chỉ số máu qua từng đợt khám bệnh
          </p>
        </div>
        <TTSPlayer text={speechSummary} label="Nghe tóm tắt xu hướng" />
      </div>

      {/* Indicator Selection Chips */}
      <div className="flex flex-wrap gap-3">
        {INDICATORS.map((ind) => {
          const isSelected = ind.code === selectedCode;
          return (
            <button
              key={ind.code}
              onClick={() => setSelectedCode(ind.code)}
              className={`px-5 py-3 rounded-2xl font-bold text-base transition shadow-sm elderly-tap-target ${
                isSelected
                  ? 'bg-[#0B6B73] text-white shadow-button'
                  : 'bg-white text-[#073F46] border border-[#DDEEEB] hover:bg-[#F2F8F7]'
              }`}
            >
              {ind.name.split(' (')[0]}
            </button>
          );
        })}
      </div>

      {/* Main Chart Card */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-[#073F46]">{activeIndicator.name}</h2>
            <div className="text-sm font-semibold text-[#5B6B77] mt-1">
              Khoảng an toàn chuẩn: <span className="text-[#15803D] font-bold">{activeIndicator.refLow} - {activeIndicator.refHigh} {activeIndicator.unit}</span>
            </div>
          </div>

          <div className="bg-[#DDEEEB] text-[#073F46] px-5 py-2.5 rounded-2xl font-black text-xl">
            {activeIndicator.data[activeIndicator.data.length - 1].value} {activeIndicator.unit}
          </div>
        </div>

        {/* Visual Bar / Point Progression */}
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {activeIndicator.data.map((point, idx) => {
              const isHigh = point.flag === 'high';
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border-2 transition ${
                    isHigh
                      ? 'border-[#DC2626]/40 bg-[#FEE2E2]/40 text-[#DC2626]'
                      : 'border-emerald-200 bg-emerald-50 text-[#15803D]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{point.date}</span>
                  </div>
                  <div className="text-2xl font-black">
                    {point.value} <span className="text-xs font-bold">{activeIndicator.unit}</span>
                  </div>
                  <div className="text-xs font-bold mt-2">
                    {isHigh ? '▲ Cao hơn chuẩn' : '✓ Trong khoảng chuẩn'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Visual Reference Zone */}
          <div className="bg-[#F8FAFA] border border-[#DDEEEB] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#073F46]">
              <Info className="w-4 h-4 text-[#0B6B73]" />
              <span>Ghi chú chuyên môn:</span>
            </div>
            <p className="text-sm text-[#5B6B77] leading-relaxed">
              Các giá trị có xu hướng tăng dần qua 4 lần khám gần nhất. Bác nên mang theo biểu đồ này khi gặp bác sĩ vào lần tái khám tới để được đánh giá phác đồ ăn uống và điều trị phù hợp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
