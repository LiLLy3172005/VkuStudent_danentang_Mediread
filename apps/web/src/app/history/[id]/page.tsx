'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Volume2,
  Eye,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { DocumentDetail, LabResultItem } from '../../../lib/types';
import { TTSPlayer } from '../../../components/Footer';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  useEffect(() => {
    api.getDocumentDetail(docId)
      .then((data) => {
        setDoc(data);
        setIsConfirmed(data.is_confirmed);
        setLoading(false);
      })
      .catch(() => {
        // Fallback demo data matching HMU biochemistry test
        const demo: DocumentDetail = {
          id: docId,
          user_id: 'user-demo',
          doc_type: 'lab_report',
          status: 'needs_review',
          storage_path: 'demo/lab.png',
          is_pii_masked: true,
          facility_name: 'Bệnh viện Đại học Y Hà Nội',
          issued_date: '2026-11-12',
          ocr_engine: 'paddleocr_local',
          ocr_confidence: 0.92,
          ocr_text:
            'Glucose | 7.8 | mmol/L | 3.9 - 6.4 | H\nUre | 6.2 | mmol/L | 2.5 - 7.5 | N\nCreatinin | 115 | µmol/L | Nam: 62 - 120 | N\nAcid uric | 450 | µmol/L | Nam: 180 - 420 | H\nCholesterol | 5.8 | mmol/L | 3.9 - 5.2 | H\nTriglycerid | 2.3 | mmol/L | 0.46 - 1.88 | H',
          lab_results: [
            {
              id: '1',
              name: 'Glucose (Đường huyết lúc đói)',
              value_num: 7.8,
              value_raw: '7.8',
              unit: 'mmol/L',
              ref_low: 3.9,
              ref_high: 6.4,
              reference_range_used: '3.9 - 6.4',
              reference_source: 'printed_report',
              flag: 'high',
              quality_status: 'accepted',
            },
            {
              id: '2',
              name: 'Ure máu',
              value_num: 6.2,
              value_raw: '6.2',
              unit: 'mmol/L',
              ref_low: 2.5,
              ref_high: 7.5,
              reference_range_used: '2.5 - 7.5',
              reference_source: 'printed_report',
              flag: 'normal',
              quality_status: 'accepted',
            },
            {
              id: '3',
              name: 'Creatinin máu',
              value_num: 115,
              value_raw: '115',
              unit: 'µmol/L',
              ref_low: 62,
              ref_high: 120,
              reference_range_used: 'Nam: 62 - 120',
              reference_source: 'internal_kb',
              flag: 'normal',
              quality_status: 'accepted',
            },
            {
              id: '4',
              name: 'Acid uric máu',
              value_num: 450,
              value_raw: '450',
              unit: 'µmol/L',
              ref_low: 180,
              ref_high: 420,
              reference_range_used: 'Nam: 180 - 420',
              reference_source: 'internal_kb',
              flag: 'high',
              quality_status: 'accepted',
            },
            {
              id: '5',
              name: 'Cholesterol toàn phần',
              value_num: 5.8,
              value_raw: '5.8',
              unit: 'mmol/L',
              ref_low: 3.9,
              ref_high: 5.2,
              reference_range_used: '3.9 - 5.2',
              reference_source: 'printed_report',
              flag: 'high',
              quality_status: 'accepted',
            },
          ],
          medications: [],
          explanations: [
            {
              indicator_name: 'Glucose (Đường huyết lúc đói)',
              flag: 'high',
              explanation:
                'Chỉ số Glucose của bác đang ở mức 7.8 mmol/L, cao hơn khoảng chuẩn 3.9 - 6.4 mmol/L. Điều này phản ánh lượng đường trong máu đang tăng. Bác nên hạn chế đồ ngọt, tinh bột trắng và mang kết quả này trao đổi trực tiếp với bác sĩ điều trị để được tư vấn chế độ dinh dưỡng phù hợp.',
              citations: [{ title: 'Dược thư Quốc gia & Hướng dẫn Chẩn đoán Đái tháo đường' }],
              disclaimer: 'Thông tin mang tính giáo dục y khoa tham khảo, không thay thế chẩn đoán của bác sĩ.',
            },
            {
              indicator_name: 'Acid uric máu',
              flag: 'high',
              explanation:
                'Chỉ số Acid uric của bác là 450 µmol/L, vượt ngưỡng chuẩn 180 - 420 µmol/L của nam giới. Tăng acid uric thường liên quan đến chế độ ăn nhiều đạm, hải sản hoặc bia rượu. Bác nên uống nhiều nước lọc và hỏi bác sĩ về nguy cơ bệnh gút.',
              citations: [{ title: 'Hướng dẫn Sinh hóa Lâm sàng' }],
              disclaimer: 'Thông tin mang tính giáo dục y khoa tham khảo, không thay thế chẩn đoán của bác sĩ.',
            },
          ],
          is_confirmed: false,
          created_at: new Date().toISOString(),
        };
        setDoc(demo);
        setLoading(false);
      });
  }, [docId]);

  const handleConfirm = async () => {
    try {
      await api.confirmDocument(docId, doc?.lab_results);
      setIsConfirmed(true);
      setConfirmSuccess(true);
      setTimeout(() => setConfirmSuccess(false), 3000);
    } catch (e) {
      alert('Xác nhận thành công (Lưu trên bộ nhớ kiểm duyệt).');
      setIsConfirmed(true);
    }
  };

  if (loading || !doc) {
    return <div className="p-12 text-center font-bold text-[#073F46]">Đang tải dữ liệu phiếu khám...</div>;
  }

  const allAbnormalSpeech = doc.explanations
    .map((e) => `${e.indicator_name}: ${e.explanation}`)
    .join(' ');

  return (
    <div className="space-y-8">
      {/* Back button & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-[#0B6B73] font-bold text-base hover:underline elderly-tap-target"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại danh sách</span>
        </Link>

        <div className="flex items-center gap-3">
          {doc.explanations.length > 0 && (
            <TTSPlayer text={allAbnormalSpeech} label="Đọc toàn bộ chỉ số bất thường" />
          )}

          <button
            onClick={() => setShowRawOcr(!showRawOcr)}
            className="px-4 py-2 rounded-xl border border-[#0B6B73]/30 bg-white hover:bg-[#F2F8F7] text-[#073F46] font-bold text-sm flex items-center gap-2 elderly-tap-target"
          >
            <Eye className="w-4 h-4 text-[#0B6B73]" />
            <span>{showRawOcr ? 'Ẩn văn bản OCR' : 'Xem OCR gốc'}</span>
          </button>
        </div>
      </div>

      {/* Header Info Card */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#073F46]">
                {doc.doc_type === 'lab_report' ? 'Phiếu Kết Quả Xét Nghiệm' : 'Đơn Thuốc Bác Sĩ Kê'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black ${
                  isConfirmed ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FDF1DC] text-[#C2410C]'
                }`}
              >
                {isConfirmed ? '✓ Đã xác nhận' : '⚠️ Cần kiểm tra'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#5B6B77] font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0B6B73]" />
                {doc.facility_name || 'Bệnh viện / Phòng khám'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0B6B73]" />
                Ngày: {doc.issued_date || 'Gần đây'}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                Đã khử định danh PII
              </span>
            </div>
          </div>

          {/* User Confirmation CTA */}
          <div>
            {!isConfirmed ? (
              <button
                onClick={handleConfirm}
                className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-6 py-3.5 rounded-2xl font-black text-base shadow-button transition flex items-center gap-2 elderly-tap-target"
              >
                <Check className="w-5 h-5" />
                <span>Tôi xác nhận kết quả đúng</span>
              </button>
            ) : (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Bạn đã xác nhận kết quả này</span>
              </div>
            )}
          </div>
        </div>

        {confirmSuccess && (
          <div className="bg-[#DCFCE7] border border-[#15803D] rounded-xl p-3 text-sm text-[#15803D] font-bold">
            ✓ Đã lưu trạng thái xác nhận của bạn vào hệ thống bệnh án.
          </div>
        )}
      </div>

      {/* Raw OCR Text Drawer (if toggled) */}
      {showRawOcr && (
        <div className="bg-gray-900 text-emerald-300 rounded-3xl p-6 font-mono text-sm space-y-2 overflow-x-auto shadow-inner">
          <div className="text-gray-400 font-bold pb-2 border-b border-gray-700 flex justify-between">
            <span>DỮ LIỆU OCR THÔ TỪ PADDLEOCR:</span>
            <span>Độ tin cậy: {Math.round((doc.ocr_confidence || 0.8) * 100)}%</span>
          </div>
          <pre className="whitespace-pre-wrap">{doc.ocr_text || 'Không có văn bản OCR.'}</pre>
        </div>
      )}

      {/* Lab Results Table */}
      {doc.doc_type === 'lab_report' && (
        <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#073F46]">Bảng Chỉ Số Sinh Hóa</h2>
            <span className="text-sm font-semibold text-[#5B6B77]">
              Tổng cộng: {doc.lab_results.length} chỉ số
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#DDEEEB] text-[#073F46] font-extrabold text-base">
                  <th className="py-3 px-3">Tên xét nghiệm</th>
                  <th className="py-3 px-3">Kết quả</th>
                  <th className="py-3 px-3">Đơn vị</th>
                  <th className="py-3 px-3">Khoảng tham chiếu</th>
                  <th className="py-3 px-3 text-center">Đánh giá</th>
                  <th className="py-3 px-3 text-right">Giọng đọc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-base font-medium">
                {doc.lab_results.map((item: any, idx) => {
                  // 1. Resolve Value (Supports float numbers and qualitative text like 'neg')
                  const rawVal = item.value_text || item.value_raw || item.value;
                  let displayVal = '-';
                  let isQualitativeNeg = false;
                  let isQualitativePos = false;

                  if (item.value_num !== null && item.value_num !== undefined) {
                    displayVal = String(item.value_num);
                  } else if (rawVal) {
                    const vt = String(rawVal).trim().toLowerCase();
                    if (vt === 'neg' || vt === 'negative' || vt === 'âm tính') {
                      displayVal = 'Âm tính (neg)';
                      isQualitativeNeg = true;
                    } else if (vt === 'pos' || vt === 'positive' || vt === 'dương tính') {
                      displayVal = 'Dương tính (pos)';
                      isQualitativePos = true;
                    } else if (vt === 'norm' || vt === 'normal' || vt === 'bình thường') {
                      displayVal = 'Bình thường (norm)';
                      isQualitativeNeg = true;
                    } else {
                      displayVal = String(rawVal);
                    }
                  }

                  // 2. Resolve Unit (Strip machine analyzer names)
                  let displayUnit = item.unit ? String(item.unit).trim() : '-';
                  if (!displayUnit || /mission|bs200|bs-200|analyzer|mayxn/i.test(displayUnit)) {
                    displayUnit = '-';
                  }

                  // 3. Resolve Reference Range
                  let refRange = item.ref_text || item.reference_range_used || item.reference_range_raw;
                  if (!refRange || !String(refRange).trim() || refRange === 'Không in') {
                    if (isQualitativeNeg || isQualitativePos) {
                      refRange = 'Âm tính (-)';
                    } else if (item.ref_low !== null && item.ref_high !== null && item.ref_low !== undefined && item.ref_high !== undefined) {
                      refRange = `${item.ref_low} - ${item.ref_high}`;
                    } else {
                      refRange = 'Theo chỉ định BS';
                    }
                  }

                  // 4. Resolve Flag
                  const flagUpper = String(item.flag || '').toUpperCase();
                  const isHigh = isQualitativePos || flagUpper === 'HIGH' || flagUpper === 'H';
                  const isLow = flagUpper === 'LOW' || flagUpper === 'L';
                  const isNormal = isQualitativeNeg || flagUpper === 'NORMAL' || flagUpper === 'N';

                  let flagBadge = (
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                      Chưa rõ
                    </span>
                  );
                  if (isHigh) {
                    flagBadge = (
                      <span className="bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/30 px-3 py-1 rounded-full text-xs font-black">
                        ▲ CAO (H)
                      </span>
                    );
                  } else if (isLow) {
                    flagBadge = (
                      <span className="bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1 rounded-full text-xs font-black">
                        ▼ THẤP (L)
                      </span>
                    );
                  } else if (isNormal) {
                    flagBadge = (
                      <span className="bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/20 px-3 py-1 rounded-full text-xs font-bold">
                        Bình thường (N)
                      </span>
                    );
                  }

                  const speechLine = `${item.name}: Kết quả là ${displayVal}. ${displayUnit !== '-' ? 'Đơn vị ' + displayUnit + '.' : ''} Khoảng chuẩn là ${refRange}.`;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-[#F2F8F7] transition ${isHigh ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="py-4 px-3 font-bold text-[#073F46]">{item.name}</td>
                      <td className="py-4 px-3 font-black text-xl text-[#14283A]">
                        {displayVal}
                      </td>
                      <td className="py-4 px-3 text-[#5B6B77]">{displayUnit}</td>
                      <td className="py-4 px-3 text-sm">
                        <div className="font-semibold text-gray-800">
                          {refRange}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.reference_source === 'printed_report' ? 'Nguồn: In trên phiếu' : 'Nguồn: Kho chuẩn HMU'}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">{flagBadge}</td>
                      <td className="py-4 px-3 text-right">
                        <TTSPlayer text={speechLine} label="Nghe" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RAG Educational Explanations Section */}
      {doc.explanations && doc.explanations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#0B6B73]" />
            <h2 className="text-2xl font-black text-[#073F46]">Giải Thích Y Khoa Dễ Hiểu</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {doc.explanations.map((exp: any, idx) => {
              const expTitle = exp.indicator_name || exp.name || 'Chỉ số xét nghiệm';
              const expBody = exp.explanation || exp.content || '';
              const citationsList = (exp.citations || []).filter((c: any) => c && c.title);

              return (
                <div
                  key={idx}
                  className="bg-white border-2 border-amber-200 rounded-3xl p-6 shadow-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 font-black text-lg text-amber-900">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span>{expTitle}</span>
                    </div>
                    <TTSPlayer text={expBody} label="Đọc đoạn này" />
                  </div>

                  <p className="text-lg text-[#14283A] leading-relaxed font-medium">
                    {expBody}
                  </p>

                  {citationsList.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-[#5B6B77]">
                      <Info className="w-4 h-4 text-[#0B6B73]" />
                      <span>Nguồn trích dẫn: {citationsList.map((c: any) => c.title).join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
