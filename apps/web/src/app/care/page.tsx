'use client';

import React, { useState, useEffect } from 'react';
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
  UserCheck,
  Heart,
  Volume2,
  ExternalLink,
} from 'lucide-react';
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

  useEffect(() => {
    const user = api.getCurrentUser();
    setCurrentUser(user);

    api.getCareLinks()
      .then((data) => {
        setCareLinks(data);
        setLoadingLinks(false);
      })
      .catch(() => {
        // Fallback demo data
        setCareLinks([
          {
            id: 'link-1',
            patient_id: 'patient-demo-1',
            patient_name: 'Nguyễn Văn An (Cụ ông)',
            caregiver_id: 'caregiver-demo-1',
            caregiver_name: 'Nguyễn Văn Minh (Con trai)',
            status: 'accepted',
            created_at: new Date().toISOString(),
          },
        ]);
        setLoadingLinks(false);
      });
  }, []);

  const userId = currentUser?.id || 'demo-patient-id-12345';
  const shortCode = 'MR-' + userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    `mediread:care:${userId}`
  )}`;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shortCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  const handleConnectByCode = async () => {
    if (!connectInput.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Vui lòng nhập mã kết nối hoặc mã QR của cụ.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedbackMsg(null);
      const res = await api.connectByCode(connectInput.trim());
      setFeedbackMsg({
        type: 'success',
        text: res.message || 'Kết nối thành công! Giờ bạn đã có thể xem hồ sơ sức khỏe của cụ.',
      });
      setConnectInput('');
      // refresh links
      const refreshed = await api.getCareLinks();
      setCareLinks(refreshed);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Không thể liên kết mã này. Vui lòng kiểm tra lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (confirm('Bác có chắc chắn muốn hủy liên kết với người chăm sóc này không?')) {
      await api.revokeCareLink(linkId);
      setCareLinks((prev) => prev.filter((l) => l.id !== linkId));
      setFeedbackMsg({ type: 'success', text: 'Đã hủy liên kết thành công.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const qrSpeech = `Đây là mã QR và mã kết nối của bác. Bác có thể cho con cháu quét mã hình vuông hoặc gửi mã số ${shortCode} để con cháu cùng theo dõi đơn thuốc và phiếu xét nghiệm của bác.`;
  const connectSpeech =
    'Mục này dành cho con cái hoặc người chăm sóc. Hãy nhập mã kết nối hoặc quét mã QR của cụ để xem kết quả xét nghiệm và lịch nhắc thuốc từ xa.';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Người Thân & Chăm Sóc</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Liên kết tài khoản qua mã QR để con cái tiện theo dõi sức khỏe và đơn thuốc của cha mẹ
          </p>
        </div>
        <TTSPlayer
          text={activeTab === 'my_qr' ? qrSpeech : connectSpeech}
          label="Nghe hướng dẫn"
        />
      </div>

      {feedbackMsg && (
        <div
          className={`border-2 rounded-2xl p-4 font-bold flex items-center gap-3 animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-[#DCFCE7] border-[#15803D] text-[#15803D]'
              : 'bg-[#FEE2E2] border-[#DC2626] text-[#DC2626]'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Two Tab Buttons */}
      <div className="grid grid-cols-2 gap-3 bg-[#DDEEEB]/60 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('my_qr')}
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
                <strong>Bảo mật thông tin:</strong> Chỉ người thân có mã QR hoặc mã này mới có thể gửi yêu cầu xem hồ sơ. Bác luôn có thể thu hồi quyền xem bất kỳ lúc nào ở danh sách bên dưới.
              </div>
            </div>
          </div>

          {/* Connected Caregivers List */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <h3 className="text-xl font-black text-[#073F46]">Con Cái / Người Chăm Sóc Đã Liên Kết</h3>

            {loadingLinks ? (
              <p className="text-sm text-gray-500 font-medium">Đang tải danh sách người chăm sóc...</p>
            ) : careLinks.length === 0 ? (
              <div className="p-6 bg-[#F8FAFA] rounded-2xl border border-gray-200 text-center text-gray-500 font-medium text-sm">
                Chưa có con cháu nào liên kết. Bác hãy gửi mã QR trên cho con cái nhé!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {careLinks.map((link) => (
                  <div
                    key={link.id}
                    className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center font-black">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-base text-[#073F46] block">
                          {link.caregiver_name || 'Người thân'}
                        </strong>
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                          ✓ Đang được phép theo dõi hồ sơ
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(link.id)}
                      className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition elderly-tap-target"
                    >
                      Hủy liên kết
                    </button>
                  </div>
                ))}
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
                Dành Cho Con Cái
              </span>
              <h2 className="text-2xl font-black text-[#073F46] mt-2">
                Kết Nối Hồ Sơ Sức Khỏe Của Cha Mẹ
              </h2>
              <p className="text-sm text-[#5B6B77] mt-1">
                Nhập mã kết nối ngắn (dạng <strong>MR-XXXXXX</strong>) hoặc mã QR do cha mẹ cung cấp:
              </p>
            </div>

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
                onClick={handleConnectByCode}
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

          {/* List of Connected Parents with Direct History Access */}
          <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <h3 className="text-xl font-black text-[#073F46]">Danh Sách Cha Mẹ Đã Liên Kết</h3>

            {careLinks.length === 0 ? (
              <div className="p-6 bg-[#F8FAFA] rounded-2xl border border-gray-200 text-center text-gray-500 font-medium text-sm">
                Bạn chưa liên kết với hồ sơ của cụ nào. Hãy nhập mã kết nối ở trên để bắt đầu!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {careLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-5 rounded-2xl border-2 border-[#DDEEEB] bg-[#F8FAFA] hover:border-[#0B6B73] transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black">
                        <Heart className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-[#073F46]">
                          {link.patient_name || 'Hồ sơ người thân'}
                        </h4>
                        <span className="text-xs text-[#5B6B77]">
                          Mã bệnh nhân: {link.patient_id?.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/history?patient_id=${link.patient_id}`}
                      className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 elderly-tap-target w-full sm:w-auto justify-center"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Xem Phiếu Khám & Đơn Thuốc Của Cụ</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
