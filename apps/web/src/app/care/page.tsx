'use client';

import React, { useState } from 'react';
import { Users, UserPlus, CheckCircle2, XCircle, ShieldAlert, ArrowRight, Clock } from 'lucide-react';
import { TTSPlayer } from '../../components/Footer';

interface CaregiverItem {
  id: string;
  name: string;
  relation: string;
  phone: string;
  status: 'pending' | 'accepted';
  date: string;
}

const INITIAL_CAREGIVERS: CaregiverItem[] = [
  {
    id: '1',
    name: 'Nguyễn Văn Minh (Con trai)',
    relation: 'Con ruột',
    phone: '0912 *** 789',
    status: 'accepted',
    date: '10/11/2026',
  },
  {
    id: '2',
    name: 'Trần Thị Mai (Con dâu)',
    relation: 'Người chăm sóc',
    phone: '0988 *** 123',
    status: 'pending',
    date: '14/11/2026',
  },
];

export default function CarePage() {
  const [links, setLinks] = useState<CaregiverItem[]>(INITIAL_CAREGIVERS);
  const [newPhone, setNewPhone] = useState('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const handleAccept = (id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'accepted' } : l))
    );
    setAlertMsg('Đã chấp thuận người thân xem hồ sơ y tế của bác.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleRevoke = (id: string) => {
    if (confirm('Bác có chắc muốn hủy quyền xem của người này không?')) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setAlertMsg('Đã hủy liên kết thành công.');
      setTimeout(() => setAlertMsg(null), 3000);
    }
  };

  const speechText =
    'Mục người chăm sóc giúp con cháu trong gia đình có thể theo dõi đơn thuốc và kết quả xét nghiệm của bác từ xa. Bác là người duy nhất có quyền đồng ý hoặc hủy bỏ quyền xem.';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Người Chăm Sóc & Người Thân</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Ủy quyền xem kết quả xét nghiệm và lịch nhắc thuốc từ xa có kiểm soát
          </p>
        </div>
        <TTSPlayer text={speechText} label="Nghe giải thích quyền hạn" />
      </div>

      {alertMsg && (
        <div className="bg-[#DCFCE7] border border-[#15803D] rounded-2xl p-4 text-[#15803D] font-extrabold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Security Privacy Notice */}
      <div className="bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-3xl p-6 shadow-sm flex items-start gap-4">
        <ShieldAlert className="w-8 h-8 text-[#0B6B73] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-lg font-black text-[#073F46]">Quy tắc bảo mật y tế nghiêm ngặt</h3>
          <p className="text-sm text-[#5B6B77] leading-relaxed">
            Người thân chỉ có thể xem hồ sơ sau khi được bác bấm nút <strong>Chấp thuận</strong>. Bác có thể hủy quyền xem bất cứ lúc nào bằng nút <strong>Hủy liên kết</strong>.
          </p>
        </div>
      </div>

      {/* Caregiver List */}
      <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
        <h2 className="text-2xl font-black text-[#073F46]">Danh Sách Người Được Ủy Quyền</h2>

        <div className="divide-y divide-gray-100">
          {links.map((link) => {
            const isAccepted = link.status === 'accepted';
            return (
              <div
                key={link.id}
                className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                      isAccepted ? 'bg-[#DDEEEB] text-[#0B6B73]' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#073F46]">{link.name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          isAccepted
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-amber-100 text-amber-900 animate-pulse'
                        }`}
                      >
                        {isAccepted ? 'Đang được xem' : 'Chờ bác đồng ý'}
                      </span>
                    </div>
                    <div className="text-sm text-[#5B6B77]">
                      Quan hệ: {link.relation} • SĐT: {link.phone} • Ngày gửi: {link.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {!isAccepted ? (
                    <button
                      type="button"
                      onClick={() => handleAccept(link.id)}
                      className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition elderly-tap-target flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Chấp thuận</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRevoke(link.id)}
                      className="bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 px-4 py-2.5 rounded-xl font-bold text-sm transition elderly-tap-target"
                    >
                      Hủy liên kết
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
