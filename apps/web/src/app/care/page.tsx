'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  QrCode,
  Link2,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Heart,
  Volume2,
  ExternalLink,
  Camera,
  Upload,
  X,
  Trash2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '../../lib/api';
import { CareLink, UserProfile } from '../../lib/types';
import { TTSPlayer } from '../../components/Footer';

export default function CarePage() {
  const [activeTab, setActiveTab] = useState<'my_qr' | 'connect'>('my_qr');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [careLinks, setCareLinks] = useState<CareLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // Connect tab inputs
  const [connectInput, setConnectInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Camera Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const user = api.getCurrentUser();
    setCurrentUser(user);

    // If logged in user is caregiver, default to 'connect' tab
    if (user?.role === 'caregiver') {
      setActiveTab('connect');
    }

    loadCareLinks();

    return () => {
      stopCamera();
    };
  }, []);

  const loadCareLinks = () => {
    setLoadingLinks(true);
    api.getCareLinks()
      .then((data) => {
        setCareLinks(data || []);
      })
      .catch(() => {
        setCareLinks([]);
      })
      .finally(() => {
        setLoadingLinks(false);
      });
  };

  const userId = currentUser?.id || 'demo-patient-id-12345';
  const shortCode = 'MR-' + userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    `mediread:care:${userId}`
  )}`;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shortCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  // Connect by string code or scanned text
  const handleConnectByCode = async (codeToUse?: string) => {
    const target = (codeToUse || connectInput).trim();
    if (!target) {
      setFeedbackMsg({ type: 'error', text: 'Vui lòng nhập mã kết nối hoặc quét mã QR của cụ.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedbackMsg(null);
      const res = await api.connectByCode(target);
      setFeedbackMsg({
        type: 'success',
        text: res.message || 'Kết nối thành công! Giờ bác/bạn đã có thể cùng theo dõi hồ sơ sức khỏe.',
      });
      setConnectInput('');
      stopCamera();
      // Refresh links
      loadCareLinks();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Không thể liên kết mã này. Vui lòng kiểm tra lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke / Unlink care connection
  const handleRevoke = async (linkId: string) => {
    if (confirm('Bác/Bạn có chắc chắn muốn HỦY LIÊN KẾT này không? Sau khi hủy, quyền xem hồ sơ sẽ tạm ngưng.')) {
      try {
        await api.revokeCareLink(linkId);
        setCareLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, status: 'revoked' } : l))
        );
        setFeedbackMsg({ type: 'success', text: 'Đã hủy liên kết thành công.' });
        setTimeout(() => setFeedbackMsg(null), 3500);
      } catch (e: any) {
        setFeedbackMsg({ type: 'error', text: e.message || 'Hủy liên kết thất bại.' });
      }
    }
  };

  // Permanently delete care link & remove from relative list
  const handleDeleteLink = async (linkId: string, name?: string) => {
    if (confirm(`Bác/Bạn có chắc muốn XÓA HOÀN TOÀN tài khoản "${name || 'người thân'}" khỏi danh sách theo dõi không?`)) {
      try {
        await api.deleteCareLink(linkId);
        setCareLinks((prev) => prev.filter((l) => l.id !== linkId));
        setFeedbackMsg({ type: 'success', text: `Đã xóa tài khoản "${name || 'người thân'}" thành công.` });
        setTimeout(() => setFeedbackMsg(null), 3500);
      } catch (e: any) {
        setFeedbackMsg({ type: 'error', text: e.message || 'Không thể xóa tài khoản người thân.' });
      }
    }
  };

  // --- Camera QR Scanner Functions ---
  const startCamera = async () => {
    setIsScanning(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera. Bác/Bạn có thể dùng nút "Tải ảnh mã QR" bên cạnh nhé.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Không thể mở Camera. Vui lòng cấp quyền truy cập Camera cho trình duyệt hoặc thử tải ảnh mã QR.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanVideoFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        // Successfully detected QR code!
        stopCamera();
        handleConnectByCode(code.data);
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(scanVideoFrame);
  };

  // Decode QR from uploaded image file
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleConnectByCode(code.data);
          } else {
            setFeedbackMsg({
              type: 'error',
              text: 'Không tìm thấy mã QR nào trong bức ảnh này. Bác hãy thử chụp lại ảnh rõ nét và đủ sáng nhé.',
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // reset input so user can pick same file again if desired
    e.target.value = '';
  };

  const qrSpeech = `Đây là mã QR và mã kết nối của bác. Bác có thể cho con cháu quét mã hình vuông hoặc gửi mã số ${shortCode} để con cháu cùng theo dõi đơn thuốc và phiếu xét nghiệm của bác.`;
  const connectSpeech =
    'Mục này dành cho con cái hoặc người chăm sóc. Hãy bấm nút Quét mã QR bằng Camera, tải ảnh QR hoặc nhập mã kết nối của cụ để xem kết quả xét nghiệm và lịch nhắc thuốc từ xa.';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Người Thân & Chăm Sóc</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Liên kết tài khoản qua mã QR để con cái tiện theo dõi sức khỏe và đơn thuốc của cha mẹ từ xa
          </p>
        </div>
        <TTSPlayer
          text={activeTab === 'my_qr' ? qrSpeech : connectSpeech}
          label="Nghe hướng dẫn"
        />
      </div>

      {feedbackMsg && (
        <div
          className={`border-2 rounded-2xl p-4 font-bold flex items-center justify-between gap-3 animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-[#DCFCE7] border-[#15803D] text-[#15803D]'
              : 'bg-[#FEE2E2] border-[#DC2626] text-[#DC2626]'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two Tab Buttons */}
      <div className="grid grid-cols-2 gap-3 bg-[#DDEEEB]/60 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab('my_qr');
            stopCamera();
          }}
          className={`py-3.5 px-4 rounded-xl font-black text-base transition flex items-center justify-center gap-2 elderly-tap-target ${
            activeTab === 'my_qr'
              ? 'bg-[#0B6B73] text-white shadow-sm'
              : 'text-[#073F46] hover:bg-white/50'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>Mã QR Của Tôi (Dành cho Cụ)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('connect')}
          className={`py-3.5 px-4 rounded-xl font-black text-base transition flex items-center justify-center gap-2 elderly-tap-target ${
            activeTab === 'connect'
              ? 'bg-[#0B6B73] text-white shadow-sm'
              : 'text-[#073F46] hover:bg-white/50'
          }`}
        >
          <Link2 className="w-5 h-5" />
          <span>Quét QR / Kết Nối (Dành cho Con)</span>
        </button>
      </div>

      {/* TAB 1: MY QR CODE */}
      {activeTab === 'my_qr' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card text-center space-y-6">
            <div>
              <span className="text-xs font-bold text-[#0B6B73] uppercase tracking-wider bg-[#E8F4F1] px-3 py-1 rounded-full">
                Mã Định Danh Sức Khỏe Gia Đình
              </span>
              <h2 className="text-2xl font-black text-[#073F46] mt-2">
                Mã QR Hồ Sơ Sức Khỏe Của Bác
              </h2>
              <p className="text-sm text-[#5B6B77] mt-1 max-w-lg mx-auto">
                Bác hãy đưa màn hình này cho con cái quét bằng camera điện thoại để liên kết chăm sóc.
              </p>
            </div>

            {/* QR Image */}
            <div className="inline-block p-4 bg-white border-4 border-[#0B6B73] rounded-3xl shadow-lg">
              <img
                src={qrDataUrl}
                alt="Mã QR Sức Khỏe"
                className="w-56 h-56 mx-auto rounded-xl"
              />
            </div>

            {/* Short Code Display */}
            <div className="bg-[#F8FAFA] border-2 border-dashed border-[#0B6B73]/40 rounded-2xl p-5 max-w-md mx-auto space-y-2">
              <div className="text-xs text-[#5B6B77] font-semibold">
                Hoặc con cái có thể nhập trực tiếp mã kết nối ngắn:
              </div>
              <div className="text-3xl font-black tracking-widest text-[#073F46]">
                {shortCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#DDEEEB] hover:bg-[#DDEEEB] text-[#0B6B73] font-bold text-sm transition elderly-tap-target"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Đã sao chép mã!' : 'Sao chép mã'}</span>
              </button>
            </div>

            {/* Privacy Protection Callout */}
            <div className="bg-[#DCFCE7]/60 border border-[#15803D]/20 rounded-2xl p-4 text-left flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#15803D] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 font-medium leading-relaxed">
                <strong>Bảo mật thông tin:</strong> Chỉ người thân có mã QR hoặc mã này mới có thể gửi yêu cầu xem hồ sơ. Bác luôn có thể thu hồi quyền xem hoặc xóa liên kết bất kỳ lúc nào ở danh sách bên dưới.
              </div>
            </div>
          </div>

          {/* Connected Caregivers List */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[#073F46]">Con Cái / Người Chăm Sóc Đã Liên Kết</h3>
              <button
                type="button"
                onClick={loadCareLinks}
                className="text-xs font-bold text-[#0B6B73] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Làm mới
              </button>
            </div>

            {loadingLinks ? (
              <p className="text-sm text-gray-500 font-medium py-4 text-center">Đang tải danh sách người chăm sóc...</p>
            ) : careLinks.length === 0 ? (
              <div className="p-6 bg-[#F8FAFA] rounded-2xl border border-gray-200 text-center text-gray-500 font-medium text-sm">
                Chưa có con cháu nào liên kết. Bác hãy gửi mã QR trên cho con cái nhé!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {careLinks.map((link) => {
                  const isRevoked = link.status === 'revoked';
                  return (
                    <div
                      key={link.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center font-black shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <strong className="text-base text-[#073F46] block">
                            {link.caregiver_name || 'Người thân chăm sóc'}
                          </strong>
                          {link.caregiver_phone && (
                            <span className="text-xs text-slate-500 font-medium block">
                              📞 SĐT: {link.caregiver_phone}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                              isRevoked
                                ? 'text-gray-500 bg-gray-100'
                                : 'text-emerald-700 bg-emerald-50'
                            }`}
                          >
                            {isRevoked ? 'Đã ngưng liên kết' : '✓ Đang được phép theo dõi hồ sơ'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(link.id)}
                            className="px-3.5 py-2 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold transition elderly-tap-target"
                          >
                            Hủy liên kết
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteLink(link.id, link.caregiver_name)}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5 elderly-tap-target"
                          title="Xóa người thân khỏi danh sách"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONNECT / SCAN CODE (CAREGIVER) */}
      {activeTab === 'connect' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
            <div>
              <span className="text-xs font-bold text-[#0B6B73] uppercase tracking-wider bg-[#E8F4F1] px-3 py-1 rounded-full">
                Dành Cho Con Cái & Người Chăm Sóc
              </span>
              <h2 className="text-2xl font-black text-[#073F46] mt-2">
                Kết Nối Hồ Sơ Sức Khỏe Của Cha Mẹ
              </h2>
              <p className="text-sm text-[#5B6B77] mt-1">
                Bác hoặc bạn có thể quét trực tiếp mã QR bằng Camera máy tính/điện thoại, tải ảnh mã QR lên hoặc nhập mã ngắn MR-XXXXXX:
              </p>
            </div>

            {/* SCANNER ACTION BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={startCamera}
                className="p-4 rounded-2xl bg-gradient-to-r from-[#073F46] to-[#0B6B73] hover:from-[#052C31] hover:to-[#073F46] text-white font-extrabold text-base flex items-center justify-center gap-3 shadow-button transition elderly-tap-target"
              >
                <Camera className="w-6 h-6 text-emerald-300" />
                <span>Quét mã QR bằng Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-2xl bg-white border-2 border-[#0B6B73] hover:bg-[#F2F8F7] text-[#073F46] font-extrabold text-base flex items-center justify-center gap-3 shadow-sm transition elderly-tap-target"
              >
                <Upload className="w-6 h-6 text-[#0B6B73]" />
                <span>Tải ảnh mã QR từ máy</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>

            {/* OR MANUAL INPUT */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-[#5B6B77] mb-2 uppercase">
                Hoặc nhập mã kết nối thủ công (dạng MR-XXXXXX):
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={connectInput}
                  onChange={(e) => setConnectInput(e.target.value)}
                  placeholder="Ví dụ: MR-A1B2C3 hoặc dán mã QR"
                  className="w-full sm:flex-1 bg-white border-2 border-[#DDEEEB] focus:border-[#0B6B73] rounded-2xl px-5 py-3.5 text-lg font-bold text-[#073F46] uppercase focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isSubmitting || !connectInput.trim()}
                  onClick={() => handleConnectByCode()}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-base shadow-button transition elderly-tap-target ${
                    isSubmitting || !connectInput.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-[#0B6B73] hover:bg-[#073F46] text-white'
                  }`}
                >
                  {isSubmitting ? 'Đang kết nối...' : 'Kết Nối Ngay'}
                </button>
              </div>
            </div>
          </div>

          {/* List of Connected Parents with Direct History Access */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[#073F46]">Danh Sách Cha Mẹ Đã Liên Kết</h3>
              <button
                type="button"
                onClick={loadCareLinks}
                className="text-xs font-bold text-[#0B6B73] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Làm mới
              </button>
            </div>

            {loadingLinks ? (
              <p className="text-sm text-gray-500 font-medium py-4 text-center">Đang tải danh sách hồ sơ...</p>
            ) : careLinks.length === 0 ? (
              <div className="p-6 bg-[#F8FAFA] rounded-2xl border border-gray-200 text-center text-gray-500 font-medium text-sm">
                Bạn chưa liên kết với hồ sơ của cụ nào. Hãy bấm nút &ldquo;Quét mã QR bằng Camera&rdquo; ở trên để bắt đầu!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {careLinks.map((link) => {
                  const isRevoked = link.status === 'revoked';
                  return (
                    <div
                      key={link.id}
                      className="p-5 rounded-2xl border-2 border-[#DDEEEB] bg-[#F8FAFA] hover:border-[#0B6B73] transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
                          <Heart className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-[#073F46]">
                              {link.patient_name || 'Hồ sơ người thân'}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isRevoked
                                  ? 'bg-gray-200 text-gray-600'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isRevoked ? 'Đã ngắt' : 'Đang liên kết'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#5B6B77]">
                              Mã bệnh nhân: {link.patient_id?.slice(0, 8)}...
                            </span>
                            {link.patient_phone && (
                              <span className="text-xs text-[#0B6B73] font-medium">
                                📞 SĐT: {link.patient_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        {!isRevoked && (
                          <Link
                            href={`/history?patient_id=${link.patient_id}`}
                            className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5 elderly-tap-target"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Xem Phiếu Khám Của Cụ</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(link.id)}
                            className="px-3.5 py-2.5 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold transition elderly-tap-target"
                          >
                            Hủy liên kết
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteLink(link.id, link.patient_name)}
                          className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5 elderly-tap-target"
                          title="Xóa tài khoản người thân"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE CAMERA QR SCANNER MODAL */}
      {isScanning && (
        <div className="fixed inset-0 bg-[#073F46]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#073F46]">Quét Mã QR Bằng Camera</h3>
                  <p className="text-xs text-gray-500">Hướng camera vào mã QR của người thân</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <p className="text-sm font-bold text-rose-700">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    fileInputRef.current?.click();
                  }}
                  className="bg-[#0B6B73] text-white px-5 py-2.5 rounded-xl font-bold text-sm"
                >
                  Tải ảnh chụp mã QR từ máy
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Box Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-4 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                    {/* Pulsing scanning beam */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent top-1/2 -translate-y-1/2 animate-pulse"></div>
                  </div>
                </div>

                <div className="absolute bottom-3 inset-x-0 text-center text-xs text-white font-bold bg-black/60 py-1.5 px-3 mx-4 rounded-xl backdrop-blur-sm">
                  Đang quét... Giữ camera ổn định trước mã QR
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  fileInputRef.current?.click();
                }}
                className="text-xs font-bold text-[#0B6B73] hover:underline flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Hoặc chọn ảnh mã QR</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
