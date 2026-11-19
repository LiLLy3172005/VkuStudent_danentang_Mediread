'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  UploadCloud,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Pill,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../lib/api';
import { TTSPlayer } from '../../components/Footer';

export default function ScanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docType, setDocType] = useState<'lab_report' | 'prescription'>('lab_report');
  const [patientSex, setPatientSex] = useState<'unknown' | 'nam' | 'nu'>('unknown');
  const [ageGroup, setAgeGroup] = useState<'unknown' | 'adult' | 'child'>('unknown');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Vui lòng chọn hoặc chụp ảnh phiếu xét nghiệm / đơn thuốc.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);
      setUploadProgress(20);

      const timer1 = setTimeout(() => setUploadProgress(50), 800);
      const timer2 = setTimeout(() => setUploadProgress(85), 1800);

      const res = await api.uploadDocument(file, docType, patientSex, ageGroup);
      clearTimeout(timer1);
      clearTimeout(timer2);
      setUploadProgress(100);

      // Redirect to history detail
      router.push(`/history/${res.document_id}`);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMsg(err.message || 'Tải ảnh lên thất bại. Vui lòng kiểm tra lại kết nối mạng.');
    }
  };

  const instructionSpeech =
    'Để AI nhận diện rõ ràng nhất, bác hãy chụp ảnh phiếu khám thật thẳng, đủ ánh sáng, và không bị mờ hay gập nếp nhé.';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title & Speech */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Chụp & Quét Phiếu Khám</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Số hóa kết quả xét nghiệm sinh hóa và đơn thuốc bác sĩ bằng trí tuệ nhân tạo MediRead AI
          </p>
        </div>
        <TTSPlayer text={instructionSpeech} label="Nghe hướng dẫn chụp" />
      </div>

      {errorMsg && (
        <div className="bg-[#FEE2E2] border-2 border-[#DC2626] rounded-2xl p-4 flex items-center gap-3 text-[#DC2626] font-bold">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-8">
        {/* Step 1: Document Type Selection */}
        <div className="space-y-3">
          <label className="block text-lg font-extrabold text-[#073F46]">
            1. Loại tài liệu y khoa cần quét:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDocType('lab_report')}
              className={`p-5 rounded-2xl border-2 text-left transition flex items-center justify-between elderly-tap-target ${
                docType === 'lab_report'
                  ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46] font-black shadow-sm'
                  : 'border-gray-200 hover:border-[#0B6B73]/50 text-[#5B6B77] font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0B6B73] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg">Phiếu xét nghiệm sinh hóa</div>
                  <div className="text-xs text-[#5B6B77] mt-0.5">Glucose, Mỡ máu, Men gan, Axit uric...</div>
                </div>
              </div>
              {docType === 'lab_report' && <CheckCircle className="w-6 h-6 text-[#0B6B73] flex-shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setDocType('prescription')}
              className={`p-5 rounded-2xl border-2 text-left transition flex items-center justify-between elderly-tap-target ${
                docType === 'prescription'
                  ? 'border-[#0B6B73] bg-[#DDEEEB] text-[#073F46] font-black shadow-sm'
                  : 'border-gray-200 hover:border-[#0B6B73]/50 text-[#5B6B77] font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0B6B73] flex items-center justify-center font-bold">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg">Đơn thuốc bác sĩ kê</div>
                  <div className="text-xs text-[#5B6B77] mt-0.5">Tên thuốc, hàm lượng, cữ uống Sáng / Tối...</div>
                </div>
              </div>
              {docType === 'prescription' && <CheckCircle className="w-6 h-6 text-[#0B6B73] flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* Step 2: Patient Demographic Context (for HMU range matching) */}
        {docType === 'lab_report' && (
          <div className="space-y-3 bg-[#F8FAFA] p-5 rounded-2xl border border-[#DDEEEB]">
            <label className="block text-base font-extrabold text-[#073F46]">
              2. Thông tin hỗ trợ đối chiếu khoảng chuẩn HMU:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#14283A] mb-1.5">Giới tính:</label>
                <select
                  value={patientSex}
                  onChange={(e) => setPatientSex(e.target.value as any)}
                  className="w-full bg-white border border-[#DDEEEB] rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B6B73]"
                >
                  <option value="unknown">Chưa rõ / Tự động nhận diện</option>
                  <option value="nam">Nam</option>
                  <option value="nu">Nữ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#14283A] mb-1.5">Nhóm tuổi:</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as any)}
                  className="w-full bg-white border border-[#DDEEEB] rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B6B73]"
                >
                  <option value="unknown">Chưa rõ / Tự động nhận diện</option>
                  <option value="adult">Người lớn (NL)</option>
                  <option value="child">Trẻ em (TE)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Photo Upload Dropzone */}
        <div className="space-y-3">
          <label className="block text-lg font-extrabold text-[#073F46]">
            {docType === 'lab_report' ? '3.' : '2.'} Chọn hoặc chụp ảnh phiếu khám:
          </label>

          <div className="border-3 border-dashed border-[#0B6B73]/40 hover:border-[#0B6B73] bg-[#F2F8F7] rounded-3xl p-8 text-center transition cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Ảnh phiếu khám"
                  className="max-h-80 mx-auto rounded-2xl shadow-md border-2 border-white object-contain"
                />
                <p className="text-sm font-bold text-[#0B6B73]">Bấm vào ảnh để chọn ảnh khác</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center mx-auto text-3xl">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="text-xl font-extrabold text-[#073F46]">
                  Chụp ảnh bằng Camera hoặc Chọn từ Máy tính / Điện thoại
                </div>
                <p className="text-sm text-[#5B6B77]">
                  Hỗ trợ định dạng JPG, PNG, WEBP. Ảnh được tự động làm nét và căn góc thẳng.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Privacy & PII Masking Note */}
        <div className="bg-[#DCFCE7] border border-[#15803D]/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-[#15803D] flex-shrink-0" />
            <div>
              <div className="font-extrabold text-[#15803D] text-base">
                Bảo vệ quyền riêng tư người bệnh (PII Masking)
              </div>
              <div className="text-xs text-gray-600">
                Tự động làm mờ họ tên, mã bệnh nhân, mã vạch trước khi xử lý trí tuệ nhân tạo.
              </div>
            </div>
          </div>
          <span className="bg-[#15803D] text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0">
            Đang kích hoạt
          </span>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className={`w-full py-4 rounded-2xl font-black text-xl shadow-button transition flex items-center justify-center gap-3 elderly-tap-target ${
              !file || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-[#0B6B73] hover:bg-[#073F46] text-white active:scale-98'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Đang xử lý OCR & Phân tích AI ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-6 h-6" />
                <span>Bắt đầu phân tích phiếu ngay</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
