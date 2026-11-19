'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  History,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Pill,
  ShieldCheck,
  User,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DocumentSummary } from '../../lib/types';
import { TTSPlayer } from '../../components/Footer';

function HistoryContent() {
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get('patient_id') || undefined;

  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listDocuments(patientIdParam)
      .then((data) => {
        setDocs(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback sample data
        setDocs([
          {
            id: 'sample-doc-1',
            user_id: 'user-1',
            doc_type: 'prescription',
            status: 'needs_review',
            facility_name: 'BV Tâm Thần TP Cần Thơ',
            issued_date: '2019-04-24',
            ocr_confidence: 0.96,
            is_pii_masked: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'sample-doc-2',
            user_id: 'user-1',
            doc_type: 'lab_report',
            status: 'confirmed',
            facility_name: 'Bệnh viện Đại học Y Dược',
            issued_date: '2026-11-12',
            ocr_confidence: 0.88,
            is_pii_masked: true,
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
        ]);
        setLoading(false);
      });
  }, [patientIdParam]);

  const speechText = patientIdParam
    ? 'Đây là danh sách hồ sơ khám bệnh và đơn thuốc của người thân mà bác hoặc bạn đang theo dõi.'
    : 'Đây là danh sách các lần khám bệnh của bác. Bác có thể bấm vào từng phiếu để nghe đọc to kết quả hoặc danh sách thuốc.';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-[#073F46]">
              {patientIdParam ? 'Hồ Sơ Y Tế Của Người Thân' : 'Lịch Sử Khám Bệnh'}
            </h1>
            {patientIdParam && (
              <span className="bg-[#DDEEEB] text-[#073F46] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Hồ sơ theo dõi
              </span>
            )}
          </div>
          <p className="text-[#5B6B77] text-base mt-1">
            Danh sách tất cả các phiếu xét nghiệm và đơn thuốc đã được số hóa & bảo mật
          </p>
        </div>
        <TTSPlayer text={speechText} label="Nghe hướng dẫn" />
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-[#5B6B77] space-y-4 border border-[#DDEEEB]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0B6B73]" />
          <p className="font-bold">Đang tải danh sách lần khám...</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-[#5B6B77] space-y-4 border-2 border-dashed border-[#DDEEEB]">
          <History className="w-12 h-12 mx-auto text-[#8A8A8A]" />
          <h3 className="text-xl font-bold text-[#073F46]">Chưa có phiếu khám nào</h3>
          <p>Hãy bấm nút bên dưới để chụp và quét phiếu đầu tiên nhé.</p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 bg-[#0B6B73] text-white px-6 py-3 rounded-2xl font-bold transition hover:bg-[#073F46]"
          >
            Quét phiếu ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {docs.map((doc) => {
            const isLab = doc.doc_type === 'lab_report';
            const isConfirmed = doc.status === 'confirmed';

            return (
              <Link
                key={doc.id}
                href={`/history/${doc.id}`}
                className="bg-white border-2 border-[#DDEEEB] hover:border-[#0B6B73] rounded-3xl p-6 transition shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      isLab ? 'bg-[#DDEEEB] text-[#0B6B73]' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isLab ? <FileText className="w-7 h-7" /> : <Pill className="w-7 h-7" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black text-[#073F46]">
                        {isLab ? 'Phiếu xét nghiệm sinh hóa' : 'Đơn thuốc bác sĩ kê'}
                      </span>
                      {doc.is_pii_masked && (
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Đã che PII
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[#5B6B77] font-medium">
                      {doc.facility_name || 'Cơ sở y tế'} • Ngày:{' '}
                      {doc.issued_date ? new Date(doc.issued_date).toLocaleDateString('vi-VN') : 'Gần đây'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isConfirmed
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#FDF1DC] text-[#C2410C]'
                      }`}
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Đã xác nhận
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4" /> Cần đối chiếu
                        </>
                      )}
                    </span>
                    {doc.ocr_confidence && (
                      <div className="text-xs text-[#8A8A8A] mt-1 font-semibold">
                        Độ nét OCR: {Math.round(doc.ocr_confidence * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#F8FAFA] group-hover:bg-[#DDEEEB] flex items-center justify-center text-[#0B6B73] transition">
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500 font-bold">Đang tải lịch sử khám...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
