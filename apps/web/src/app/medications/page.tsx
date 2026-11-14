'use client';

import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Sparkles, Volume2, Calendar } from 'lucide-react';
import { TTSPlayer } from '../../components/Footer';

interface ScheduleSlot {
  id: string;
  name: string;
  time: string;
  slotName: string;
  dosage: string;
  instructions: string;
  status: 'pending' | 'taken' | 'skipped';
}

const INITIAL_SCHEDULES: ScheduleSlot[] = [
  {
    id: '1',
    name: 'Amlodipin 5mg',
    time: '07:00',
    slotName: 'Cữ Sáng',
    dosage: '1 viên',
    instructions: 'Uống sau bữa ăn sáng 15 phút',
    status: 'taken',
  },
  {
    id: '2',
    name: 'Metformin 500mg',
    time: '11:30',
    slotName: 'Cữ Trưa',
    dosage: '1 viên',
    instructions: 'Uống ngay trước bữa ăn trưa',
    status: 'pending',
  },
  {
    id: '3',
    name: 'Vitamin B tổng hợp',
    time: '16:00',
    slotName: 'Cữ Chiều',
    dosage: '1 viên',
    instructions: 'Uống với nhiều nước lọc',
    status: 'pending',
  },
  {
    id: '4',
    name: 'Metformin 500mg',
    time: '20:00',
    slotName: 'Cữ Tối',
    dosage: '1 viên',
    instructions: 'Uống sau bữa ăn tối',
    status: 'pending',
  },
];

export default function MedicationsPage() {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>(INITIAL_SCHEDULES);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleMark = (id: string, newStatus: 'taken' | 'skipped') => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    const target = schedules.find((s) => s.id === id);
    const statusText = newStatus === 'taken' ? 'Đã uống' : 'Bỏ qua';
    setLastAction(`Đã ghi nhận: ${target?.name} - ${statusText}`);
    setTimeout(() => setLastAction(null), 3000);
  };

  const pendingCount = schedules.filter((s) => s.status === 'pending').length;
  const speechText = `Hôm nay bác có 4 cữ uống thuốc. Bác đã uống 1 cữ, còn ${pendingCount} cữ chưa uống. Cữ tiếp theo là Metformin vào lúc 11 giờ 30 trưa.`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Lịch Uống Thuốc Hôm Nay</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            4 khung giờ nhắc thuốc cố định cho người cao tuổi kèm chuông báo
          </p>
        </div>
        <TTSPlayer text={speechText} label="Nghe lịch thuốc hôm nay" />
      </div>

      {lastAction && (
        <div className="bg-[#DCFCE7] border border-[#15803D] rounded-2xl p-4 text-[#15803D] font-extrabold flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{lastAction}</span>
        </div>
      )}

      {/* 4 Time Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schedules.map((slot) => {
          const isTaken = slot.status === 'taken';
          const isSkipped = slot.status === 'skipped';

          return (
            <div
              key={slot.id}
              className={`bg-white border-2 rounded-3xl p-6 transition shadow-card flex flex-col justify-between gap-6 ${
                isTaken
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : isSkipped
                  ? 'border-gray-200 bg-gray-50 opacity-75'
                  : 'border-[#0B6B73]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 bg-[#DDEEEB] text-[#073F46] px-3.5 py-1.5 rounded-xl font-black text-sm">
                    <Clock className="w-4 h-4 text-[#0B6B73]" />
                    <span>{slot.slotName} ({slot.time})</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      isTaken
                        ? 'bg-emerald-100 text-emerald-800'
                        : isSkipped
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isTaken ? '✓ Đã uống' : isSkipped ? 'Đã bỏ qua' : 'Chưa uống'}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-[#073F46]">{slot.name}</h3>
                  <div className="text-lg font-bold text-[#14283A] mt-1">
                    Liều lượng: <span className="text-[#0B6B73]">{slot.dosage}</span>
                  </div>
                  <p className="text-sm text-[#5B6B77] mt-1 font-medium">{slot.instructions}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleMark(slot.id, 'taken')}
                  className={`flex-1 py-3.5 rounded-2xl font-black text-base transition flex items-center justify-center gap-2 elderly-tap-target ${
                    isTaken
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-[#0B6B73] hover:bg-[#073F46] text-white shadow-button'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{isTaken ? 'Đã xác nhận uống' : 'Bấm: Đã uống'}</span>
                </button>

                {!isTaken && (
                  <button
                    type="button"
                    onClick={() => handleMark(slot.id, 'skipped')}
                    className="px-4 py-3.5 rounded-2xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition elderly-tap-target"
                  >
                    Bỏ qua
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
