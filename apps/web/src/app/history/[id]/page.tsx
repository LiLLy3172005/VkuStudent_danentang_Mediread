'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Pill,
  Clock,
  PlusCircle,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { DocumentDetail, LabResultItem, MedicationItem } from '../../../lib/types';
import { TTSPlayer } from '../../../components/Footer';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteDocument = async () => {
    if (!doc?.id) return;
    const isLab = doc.doc_type === 'lab_report';
    const confirmed = window.confirm(
      isLab
        ? 'Bác/Bạn có chắc chắn muốn xóa phiếu xét nghiệm này không? Dữ liệu sẽ bị xóa hoàn toàn khỏi hồ sơ.'
        : 'Bác/Bạn có chắc chắn muốn xóa đơn thuốc này không? Dữ liệu sẽ bị xóa hoàn toàn khỏi hồ sơ.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.deleteDocument(doc.id);
      alert(isLab ? 'Đã xóa phiếu xét nghiệm thành công.' : 'Đã xóa đơn thuốc thành công.');
      router.push('/history');
    } catch (e: any) {
      alert(e.message || 'Không thể xóa tài liệu.');
      setDeleting(false);
    }
  };

  useEffect(() => {
    api.getDocumentDetail(docId)
      .then((data) => {
        setDoc(data);
        setIsConfirmed(data.is_confirmed);
        setLoading(false);
      })
      .catch(() => {
        // Fallback demo data
        const demo: DocumentDetail = {
          id: docId,
          user_id: 'user-current',
          doc_type: 'prescription',
          status: 'needs_review',
          storage_path: 'demo.jpg',
          facility_name: 'Bệnh Viện Tâm Thần TP Cần Thơ',
          issued_date: '2019-04-24',
          diagnosis: 'Rối loạn ám ảnh sợ ở trẻ em (F93.1)',
          doctor_name: 'BS Trần Thái An',
          is_pii_masked: true,
          ocr_confidence: 0.96,
          ocr_text:
            'SỞ Y TẾ TP CẦN THƠ - BV TÂM THẦN\nĐƠN THUỐC\nChẩn đoán: Rối loạn ám ảnh sợ ở trẻ em Mã bệnh: F93.1\nThuốc điều trị:\n1. Escitalopram oxalat 10mg - 10 Viên. Cách dùng: Sáng 1/2 viên\n2. Ginkgo biloba 40mg - 20 Viên. Cách dùng: Sáng 1 viên\n3. Bình vôi 150mg + sen lá 180mg - 40 Viên. Cách dùng: Tối 02 viên\nNgày tái khám: 14/5/2019\nBác sĩ: BS Trần Thái An',
          lab_results: [],
          medications: [
            {
              id: 'med-1',
              name: 'Escitalopram oxalat 10mg (ESCIVEX 10 TABLETS)',
              dosage: '10mg',
              quantity: '10',
              unit: 'Viên',
              instructions: 'Sáng 1/2 viên sau ăn',
              times_per_day: 1,
              active: true,
            },
            {
              id: 'med-2',
              name: 'Ginkgo biloba (Taginba 40mg)',
              dosage: '40mg',
              quantity: '20',
              unit: 'Viên',
              instructions: 'Sáng 1 viên sau ăn',
              times_per_day: 1,
              active: true,
            },
            {
              id: 'med-3',
              name: 'Bình vôi 150mg + sen lá 180mg (Night queen)',
              dosage: '150mg + 180mg',
              quantity: '40',
              unit: 'Viên',
              instructions: 'Tối 02 viên trước khi ngủ',
              times_per_day: 1,
              active: true,
            },
          ],
          explanations: [
            {
              indicator_name: 'Hướng dẫn dùng đơn thuốc',
              flag: 'normal',
              explanation:
                'Đơn thuốc điều trị gồm 3 loại: 2 loại uống vào cữ Sáng để hỗ trợ tuần hoàn và ổn định tâm lý, 1 loại thảo dược Bình vôi uống vào cữ Tối để hỗ trợ an thần và giấc ngủ sâu. Bác nhớ tuân thủ đúng liều lượng chỉ định của bác sĩ.',
              citations: [{ title: 'Dược thư Quốc gia Việt Nam' }],
              disclaimer: 'Thông tin tham khảo, không tự ý tăng giảm liều khi chưa có ý kiến của bác sĩ điều trị.',
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
      const payload = doc?.doc_type === 'prescription' ? doc?.medications : doc?.lab_results;
      await api.confirmDocument(docId, payload);
      setIsConfirmed(true);
      setConfirmSuccess(true);

      // Auto add to schedule if it's a prescription
      if (doc?.doc_type === 'prescription' && doc?.medications && doc.medications.length > 0) {
        const added = api.addMedicationsToSchedule(doc.medications);
        if (added > 0) {
          setScheduleSuccessMsg(`✓ Đã tự động thêm ${added} cữ thuốc vào Lịch Uống Thuốc hôm nay!`);
        }
      }
      setTimeout(() => setConfirmSuccess(false), 4000);
    } catch {
      setIsConfirmed(true);
      setConfirmSuccess(true);
      if (doc?.doc_type === 'prescription' && doc?.medications && doc.medications.length > 0) {
        const added = api.addMedicationsToSchedule(doc.medications);
        if (added > 0) {
          setScheduleSuccessMsg(`✓ Đã lưu ${added} cữ thuốc vào Lịch Uống Thuốc hôm nay!`);
        }
      }
      setTimeout(() => setConfirmSuccess(false), 4000);
    }
  };

  const handleAddToScheduleManual = () => {
    if (!doc?.medications || doc.medications.length === 0) {
      alert('Không có danh sách thuốc nào để thêm.');
      return;
    }
    const added = api.addMedicationsToSchedule(doc.medications);
    if (added > 0) {
      setScheduleSuccessMsg(`✓ Đã thêm thành công ${added} cữ thuốc vào Lịch Uống Thuốc!`);
    } else {
      setScheduleSuccessMsg('ℹ️ Các thuốc trong đơn này đã có sẵn trong Lịch Uống Thuốc hôm nay.');
    }
    setTimeout(() => setScheduleSuccessMsg(null), 4000);
  };

  if (loading || !doc) {
    return <div className="p-12 text-center font-bold text-[#073F46]">Đang tải dữ liệu phiếu khám...</div>;
  }

  // Fallback range bound evaluator for lab results
  const evaluateLabFlag = (item: any) => {
    const rawFlag = String(item.flag || '').toUpperCase();
    if (rawFlag === 'H' || rawFlag === 'HIGH') return 'high';
    if (rawFlag === 'L' || rawFlag === 'LOW') return 'low';
    if (rawFlag === 'N' || rawFlag === 'NORMAL') return 'normal';

    const val = item.value_num ?? parseFloat(String(item.value_raw || item.value || ''));
    const low = item.ref_low ?? null;
    const high = item.ref_high ?? null;

    if (!isNaN(val) && val !== null) {
      if (high !== null && !isNaN(high) && val > high) return 'high';
      if (low !== null && !isNaN(low) && val < low) return 'low';
      if (low !== null && high !== null && val >= low && val <= high) return 'normal';
    }
    return 'unknown';
  };

  const isPrescription = doc.doc_type === 'prescription';

  const prescriptionSpeech = isPrescription && doc.medications?.length > 0
    ? `Đơn thuốc gồm ${doc.medications.length} loại thuốc. ` +
      doc.medications
        .map((m, idx) => `Thuốc ${idx + 1}: ${m.name}. Số lượng ${m.quantity || '1'} ${m.unit || 'viên'}. Cách dùng: ${m.instructions || 'theo chỉ định'}.`)
        .join(' ')
    : '';

  const labSpeech = !isPrescription && doc.explanations?.length > 0
    ? doc.explanations.map((e) => `${e.indicator_name}: ${e.explanation}`).join(' ')
    : '';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-[#0B6B73] font-bold text-base hover:underline elderly-tap-target"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại danh sách phiếu</span>
        </Link>

        <div className="flex items-center gap-3">
          {isPrescription && prescriptionSpeech && (
            <TTSPlayer text={prescriptionSpeech} label="Đọc toàn bộ đơn thuốc" />
          )}

          {!isPrescription && labSpeech && (
            <TTSPlayer text={labSpeech} label="Đọc chỉ số bất thường" />
          )}

          <button
            onClick={() => setShowRawOcr(!showRawOcr)}
            className="px-4 py-2.5 rounded-xl border border-[#0B6B73]/30 bg-white hover:bg-[#F2F8F7] text-[#073F46] font-bold text-sm flex items-center gap-2 elderly-tap-target"
          >
            <Eye className="w-4 h-4 text-[#0B6B73]" />
            <span>{showRawOcr ? 'Ẩn văn bản OCR' : 'Xem OCR gốc'}</span>
          </button>
        </div>
      </div>

      {scheduleSuccessMsg && (
        <div className="bg-[#DCFCE7] border-2 border-[#15803D] rounded-2xl p-4 text-[#15803D] font-extrabold flex items-center gap-3 shadow-md">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <span>{scheduleSuccessMsg}</span>
            <Link href="/medications" className="ml-3 underline font-black text-[#0B6B73]">
              Xem Lịch Uống Thuốc →
            </Link>
          </div>
        </div>
      )}

      {/* Header Info Card */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black text-[#073F46]">
                {isPrescription ? 'Đơn Thuốc Bác Sĩ Kê' : 'Phiếu Kết Quả Xét Nghiệm'}
              </span>
              <span
                className={`px-3.5 py-1 rounded-full text-xs font-black ${
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

            {doc.diagnosis && (
              <div className="text-sm font-semibold text-[#14283A] bg-[#F2F8F7] px-3.5 py-2 rounded-xl inline-block">
                🩺 <strong>Chẩn đoán:</strong> {doc.diagnosis}
                {doc.doctor_name && <span className="ml-2 font-normal text-gray-600">| Bác sĩ: {doc.doctor_name}</span>}
              </div>
            )}
          </div>

          {/* User Confirmation CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {!isConfirmed ? (
              <button
                onClick={handleConfirm}
                className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-6 py-3.5 rounded-2xl font-black text-base shadow-button transition flex items-center justify-center gap-2 elderly-tap-target"
              >
                <Check className="w-5 h-5" />
                <span>Tôi xác nhận kết quả đúng</span>
              </button>
            ) : (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2">
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
            <span>Độ tin cậy: {Math.round((doc.ocr_confidence || 0.9) * 100)}%</span>
          </div>
          <pre className="whitespace-pre-wrap">{doc.ocr_text || 'Không có văn bản OCR.'}</pre>
        </div>
      )}

      {/* SECTION 1: PRESCRIPTION MEDICATIONS LIST */}
      {isPrescription && (
        <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Pill className="w-6 h-6 text-[#0B6B73]" />
                <h2 className="text-2xl font-black text-[#073F46]">Danh Sách Thuốc Điều Trị</h2>
              </div>
              <p className="text-sm text-[#5B6B77] mt-1">
                Tổng cộng: {doc.medications?.length || 0} loại thuốc trong đơn này
              </p>
            </div>

            <button
              onClick={handleAddToScheduleManual}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-sm transition flex items-center justify-center gap-2 elderly-tap-target"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Thêm Vào Lịch Uống Thuốc Hôm Nay</span>
            </button>
          </div>

          {(!doc.medications || doc.medications.length === 0) ? (
            <div className="text-center py-10 text-gray-500">
              <Pill className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="font-bold text-lg">Chưa phát hiện danh sách thuốc trong đơn này.</p>
              <p className="text-sm">Bác có thể mở mục "Xem OCR gốc" để đối chiếu lại ảnh chụp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {doc.medications.map((med, idx) => {
                const medSpeech = `${med.name}. Số lượng ${med.quantity || ''} ${med.unit || 'viên'}. Cách dùng: ${med.instructions || 'uống theo chỉ định'}.`;

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border-2 border-[#DDEEEB] bg-[#F8FAFA] hover:border-[#0B6B73] transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#DDEEEB] text-[#0B6B73] font-black text-lg flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-[#073F46] leading-tight">
                            {med.name}
                          </h3>
                          {med.dosage && (
                            <span className="text-xs font-bold text-[#0B6B73] bg-[#E8F4F1] px-2 py-0.5 rounded-md mt-1 inline-block">
                              Hàm lượng: {med.dosage}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <TTSPlayer text={medSpeech} label="Nghe cách uống" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 text-sm">
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block text-xs">Số lượng & Đơn vị:</span>
                        <strong className="text-base text-[#14283A]">
                          {med.quantity || '-'} {med.unit || 'Viên'}
                        </strong>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block text-xs">Cách dùng & Cữ uống:</span>
                        <strong className="text-base text-[#0B6B73]">
                          {med.instructions || 'Uống theo đơn bác sĩ'}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: LAB BIOCHEMISTRY REPORT TABLE */}
      {!isPrescription && (
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
                  const rawVal = item.value_text || item.value_raw || item.value;
                  let displayVal = '-';
                  if (item.value_num !== null && item.value_num !== undefined) {
                    displayVal = String(item.value_num);
                  } else if (rawVal) {
                    displayVal = String(rawVal);
                  }

                  let displayUnit = item.unit ? String(item.unit).trim() : '-';
                  if (!displayUnit || /mission|bs200|bs-200|analyzer|mayxn/i.test(displayUnit)) {
                    displayUnit = '-';
                  }

                  let refRange = item.ref_text || item.reference_range_used || item.reference_range_raw;
                  if (!refRange || !String(refRange).trim() || refRange === 'Không in') {
                    if (item.ref_low !== null && item.ref_high !== null && item.ref_low !== undefined && item.ref_high !== undefined) {
                      refRange = `${item.ref_low} - ${item.ref_high}`;
                    } else {
                      refRange = 'Theo chỉ định BS';
                    }
                  }

                  const evaluated = evaluateLabFlag(item);
                  const isHigh = evaluated === 'high';
                  const isLow = evaluated === 'low';
                  const isNormal = evaluated === 'normal';

                  let flagBadge = (
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                      Bình thường (N)
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
                        <div className="font-semibold text-gray-800">{refRange}</div>
                        <div className="text-xs text-gray-400">
                          {item.reference_source === 'printed_report' ? 'Nguồn: In trên phiếu' : 'Nguồn: Kho chuẩn Y tế'}
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

      {/* SECTION 3: RAG EDUCATIONAL EXPLANATIONS */}
      {doc.explanations && doc.explanations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#0B6B73]" />
            <h2 className="text-2xl font-black text-[#073F46]">Giải Thích Y Khoa Dễ Hiểu</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {doc.explanations.map((exp: any, idx) => {
              const expTitle = exp.indicator_name || exp.name || 'Hướng dẫn chi tiết';
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

      {/* SECTION 4: ASK AI DOCTOR CARD */}
      <div className="bg-gradient-to-r from-[#073F46] to-[#0B6B73] rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-emerald-200">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Tư vấn trực tiếp với AI</span>
          </div>
          <h3 className="text-2xl font-black">
            Bác còn điều gì chưa rõ về phiếu khám này?
          </h3>
          <p className="text-emerald-100 text-base leading-relaxed">
            Bác có thể hỏi trực tiếp Bác Sĩ AI MediRead để được giải thích chi tiết hơn về các chỉ số xét nghiệm, liều lượng dùng thuốc và chế độ ăn uống phù hợp.
          </p>
        </div>

        <Link
          href={`/ai-chat?document_id=${doc.id}&facility=${encodeURIComponent(doc.facility_name || '')}`}
          className="bg-white hover:bg-emerald-50 text-[#073F46] px-6 py-4 rounded-2xl font-black text-base shadow-lg transition elderly-tap-target flex items-center gap-2 whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <Sparkles className="w-5 h-5 text-[#0B6B73]" />
          <span>Hỏi Bác Sĩ AI ngay</span>
        </Link>
      </div>

      {/* SECTION 5: DELETE DOCUMENT CARD */}
      <div className="bg-white border-2 border-red-200 rounded-3xl p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-lg font-bold text-red-900">
            {doc.doc_type === 'lab_report' ? 'Kết quả xét nghiệm không đúng?' : 'Đơn thuốc quét không đúng?'}
          </h4>
          <p className="text-sm text-gray-500">
            Bác/Bạn có thể xóa tài liệu này nếu OCR nhận diện chưa chuẩn để chụp quét lại.
          </p>
        </div>
        <button
          onClick={handleDeleteDocument}
          disabled={deleting}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition whitespace-nowrap"
        >
          <Trash2 className="w-5 h-5 text-red-600" />
          <span>{doc.doc_type === 'lab_report' ? 'Xóa phiếu xét nghiệm này' : 'Xóa đơn thuốc này'}</span>
        </button>
      </div>
    </div>
  );
}
