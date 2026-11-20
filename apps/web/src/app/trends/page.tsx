'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertCircle,
  Calendar,
  Info,
  Camera,
  RotateCcw,
  Sparkles,
  FileText,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { TTSPlayer } from '../../components/Footer';
import { api } from '../../lib/api';
import { DocumentSummary, DocumentDetail, LabResultItem } from '../../lib/types';

interface RealTrendPoint {
  date: string;
  value: number;
  unit: string;
  flag: 'normal' | 'high' | 'low' | 'unknown';
  referenceRange?: string;
  docId?: string;
}

interface DynamicIndicator {
  code: string;
  name: string;
  unit: string;
  refRange: string;
  data: RealTrendPoint[];
}

export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState<DynamicIndicator[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');

  const loadRealTrends = async () => {
    setLoading(true);
    try {
      const docs = await api.getDocuments();
      if (!docs || docs.length === 0) {
        setIndicators([]);
        setLoading(false);
        return;
      }

      // Fetch details of recent lab reports (up to 10)
      const labDocs = docs.filter((d) => d.doc_type !== 'prescription').slice(0, 10);
      const docDetails: DocumentDetail[] = await Promise.all(
        labDocs.map((d) => api.getDocumentDetail(d.id).catch(() => null as any))
      );

      // Group lab results by normalized code or name
      const indicatorMap: Record<string, DynamicIndicator> = {};

      for (const d of docDetails) {
        if (!d || !d.lab_results) continue;
        const rawDate = d.issued_date || d.created_at || '';
        const formattedDate = rawDate
          ? new Date(rawDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'Gần đây';

        for (const item of d.lab_results) {
          const codeKey = (item.normalized_code || item.name || 'OTHER').toUpperCase().trim();
          const numVal = typeof item.value_num === 'number' ? item.value_num : parseFloat(String(item.value_text || ''));

          if (isNaN(numVal)) continue;

          let cleanFlag: 'normal' | 'high' | 'low' | 'unknown' = 'normal';
          const rawFlag = String(item.flag || '').toLowerCase();
          if (rawFlag.includes('high') || rawFlag.includes('cao')) cleanFlag = 'high';
          else if (rawFlag.includes('low') || rawFlag.includes('thap') || rawFlag.includes('thấp')) cleanFlag = 'low';

          if (!indicatorMap[codeKey]) {
            indicatorMap[codeKey] = {
              code: codeKey,
              name: item.name || codeKey,
              unit: item.unit || '',
              refRange: item.reference_range_used || '',
              data: [],
            };
          }

          indicatorMap[codeKey].data.push({
            date: formattedDate,
            value: numVal,
            unit: item.unit || '',
            flag: cleanFlag,
            referenceRange: item.reference_range_used || undefined,
            docId: d.id,
          });
        }
      }

      const list = Object.values(indicatorMap).filter((i) => i.data.length > 0);
      setIndicators(list);
      if (list.length > 0 && !selectedCode) {
        setSelectedCode(list[0].code);
      }
    } catch (e) {
      console.warn('Could not load real trend data', e);
      setIndicators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealTrends();
  }, []);

  const activeIndicator = indicators.find((i) => i.code === selectedCode) || indicators[0];

  const speechSummary = activeIndicator
    ? `Biểu đồ theo dõi chỉ số ${activeIndicator.name}. Kết quả gần nhất ngày ${
        activeIndicator.data[activeIndicator.data.length - 1]?.date || ''
      } là ${activeIndicator.data[activeIndicator.data.length - 1]?.value || ''} ${activeIndicator.unit}.`
    : 'Chưa có dữ liệu xét nghiệm nào được ghi nhận.';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Xu Hướng Chỉ Số Sức Khỏe</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Biểu đồ trực quan theo dõi diễn biến các chỉ số máu thực tế qua từng đợt khám bệnh của bác
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadRealTrends}
            className="px-3.5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm flex items-center gap-2 elderly-tap-target transition"
            title="Làm mới dữ liệu từ các phiếu xét nghiệm"
          >
            <RotateCcw className="w-4 h-4 text-gray-500" />
            <span>Làm mới</span>
          </button>
          {activeIndicator && <TTSPlayer text={speechSummary} label="Nghe tóm tắt xu hướng" />}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-500 font-bold bg-white rounded-3xl border border-[#DDEEEB]">
          Đang tổng hợp dữ liệu xét nghiệm từ hồ sơ của bác...
        </div>
      ) : indicators.length === 0 ? (
        /* Clean Empty State - No Fake / Mock Data */
        <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-card">
          <div className="w-20 h-20 rounded-3xl bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center mx-auto text-3xl shadow-sm">
            <TrendingUp className="w-10 h-10" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-[#073F46]">
              Chưa Có Dữ Liệu Xu Hướng Xét Nghiệm
            </h2>
            <p className="text-base text-[#5B6B77] leading-relaxed">
              Hệ thống không còn hiển thị dữ liệu mẫu. Khi bác quét các phiếu xét nghiệm máu, MediRead AI sẽ tự động gom các chỉ số (như Glucose, Creatinin, Mỡ máu...) và vẽ biểu đồ diễn tiến qua các lần khám tại đây.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2.5 bg-[#0B6B73] hover:bg-[#073F46] text-white px-7 py-4 rounded-2xl font-black text-base shadow-button transition elderly-tap-target"
            >
              <Camera className="w-5 h-5" />
              <span>Chụp / Quét Phiếu Xét Nghiệm Mới</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Real Indicators Display */
        <>
          {/* Indicator Selection Chips */}
          <div className="flex flex-wrap gap-2.5">
            {indicators.map((ind) => {
              const isSelected = ind.code === activeIndicator.code;
              return (
                <button
                  key={ind.code}
                  onClick={() => setSelectedCode(ind.code)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition shadow-sm elderly-tap-target ${
                    isSelected
                      ? 'bg-[#0B6B73] text-white shadow-button'
                      : 'bg-white text-[#073F46] border border-[#DDEEEB] hover:bg-[#F2F8F7]'
                  }`}
                >
                  {ind.name}
                </button>
              );
            })}
          </div>

          {/* Main Chart Card */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs uppercase font-extrabold text-[#0B6B73] bg-[#E8F4F1] px-3 py-1 rounded-full">
                  Mã chỉ số: {activeIndicator.code}
                </span>
                <h2 className="text-2xl font-black text-[#073F46] mt-2">{activeIndicator.name}</h2>
                {activeIndicator.refRange && (
                  <div className="text-sm font-semibold text-[#5B6B77] mt-1">
                    Khoảng an toàn chuẩn: <span className="text-[#15803D] font-bold">{activeIndicator.refRange} {activeIndicator.unit}</span>
                  </div>
                )}
              </div>

              <div className="bg-[#DDEEEB] text-[#073F46] px-5 py-2.5 rounded-2xl font-black text-xl">
                {activeIndicator.data[activeIndicator.data.length - 1].value} {activeIndicator.unit}
              </div>
            </div>

            {/* Visual Bar / Point Progression */}
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeIndicator.data.map((point, idx) => {
                  const isHigh = point.flag === 'high';
                  const isLow = point.flag === 'low';
                  const isAbnormal = isHigh || isLow;

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border-2 transition ${
                        isAbnormal
                          ? isHigh
                            ? 'border-rose-300 bg-rose-50 text-rose-800'
                            : 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 text-xs text-gray-500 font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{point.date}</span>
                        </span>
                        {point.docId && (
                          <Link
                            href={`/history/${point.docId}`}
                            className="text-[#0B6B73] hover:underline font-bold"
                          >
                            Xem phiếu
                          </Link>
                        )}
                      </div>
                      <div className="text-2xl font-black mt-2">
                        {point.value} <span className="text-sm font-bold">{point.unit || activeIndicator.unit}</span>
                      </div>
                      <div className="text-xs font-bold mt-2">
                        {isHigh ? '▲ Cao hơn chuẩn' : isLow ? '▼ Thấp hơn chuẩn' : '✓ Trong khoảng chuẩn'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Consultation Link Card */}
              <div className="bg-[#F8FAFA] border border-[#DDEEEB] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-sm text-[#073F46] block">Bác có thắc mắc về chỉ số {activeIndicator.name}?</strong>
                    <span className="text-xs text-[#5B6B77]">Hỏi trực tiếp Bác Sĩ AI để được giải thích ý nghĩa sức khỏe và chế độ dinh dưỡng.</span>
                  </div>
                </div>

                <Link
                  href={`/ai-chat`}
                  className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition whitespace-nowrap self-stretch sm:self-auto text-center"
                >
                  Hỏi Bác Sĩ AI
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
