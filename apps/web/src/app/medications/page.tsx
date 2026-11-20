'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Volume2,
  Calendar,
  RotateCcw,
  PlusCircle,
  Pill,
  Sun,
  Sunset,
  Moon,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ScheduleItem } from '../../lib/types';
import { TTSPlayer } from '../../components/Footer';

export default function MedicationsPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDosage, setNewDosage] = useState<string>('1 viên');
  const [newSlot, setNewSlot] = useState<'morning' | 'noon' | 'evening'>('morning');
  const [newInstructions, setNewInstructions] = useState<string>('Uống sau khi ăn no với nước ấm');

  useEffect(() => {
    const list = api.getMedicationSchedules();
    setSchedules(list);
  }, []);

  const handleMark = (id: string, newStatus: 'taken' | 'skipped') => {
    const updated = api.markScheduleDose(id, newStatus);
    setSchedules(updated);
    const target = schedules.find((s) => s.id === id);
    const statusText = newStatus === 'taken' ? 'Đã uống' : 'Bỏ qua';
    setLastAction(`✓ Đã ghi nhận: ${target?.name} - ${statusText}`);
    setTimeout(() => setLastAction(null), 3500);
  };

  const handleResetDay = () => {
    if (confirm('Bác có muốn đặt lại trạng thái tất cả các cữ thuốc cho ngày mới không?')) {
      const resetList = api.resetScheduleDay();
      setSchedules(resetList);
      setLastAction('✓ Đã làm mới lịch uống thuốc cho ngày hôm nay.');
      setTimeout(() => setLastAction(null), 3500);
    }
  };

  const handleClearAll = () => {
    if (confirm('Bác có chắc muốn xóa TOÀN BỘ lịch uống thuốc hiện tại không? Thao tác này sẽ xóa sạch danh sách thuốc để bác làm mới hoặc quét đơn thuốc mới.')) {
      api.clearAllMedicationSchedules();
      setSchedules([]);
      setLastAction('✓ Đã xóa sạch toàn bộ lịch uống thuốc.');
      setTimeout(() => setLastAction(null), 3500);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bác có chắc muốn xóa thuốc "${name}" khỏi lịch uống không?`)) {
      const updated = api.deleteMedicationScheduleItem(id);
      setSchedules(updated);
      setLastAction(`✓ Đã xóa thuốc: ${name}`);
      setTimeout(() => setLastAction(null), 3500);
    }
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Bác vui lòng nhập tên thuốc nhé!');
      return;
    }
    const newItem = api.addManualMedicationScheduleItem({
      name: newName,
      dosage: newDosage,
      slotKey: newSlot,
      instructions: newInstructions,
    });
    setSchedules(api.getMedicationSchedules());
    setShowAddModal(false);
    setNewName('');
    setNewDosage('1 viên');
    setNewInstructions('Uống sau khi ăn no với nước ấm');
    setLastAction(`✓ Đã thêm thuốc mới: ${newItem.name}`);
    setTimeout(() => setLastAction(null), 3500);
  };

  const totalDoses = schedules.length;
  const takenDoses = schedules.filter((s) => s.status === 'taken').length;
  const pendingDoses = schedules.filter((s) => s.status === 'pending').length;
  const progressPercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  const speechText = `Hôm nay bác có ${totalDoses} cữ uống thuốc. Bác đã uống ${takenDoses} cữ, còn ${pendingDoses} cữ chưa uống. Bác nhớ uống đúng giờ và uống kèm nhiều nước lọc nhé.`;

  // Group by slotKey
  const morningList = schedules.filter((s) => s.slotKey === 'morning');
  const noonList = schedules.filter((s) => s.slotKey === 'noon');
  const eveningList = schedules.filter((s) => s.slotKey === 'evening');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#073F46]">Lịch Uống Thuốc Hôm Nay</h1>
          <p className="text-[#5B6B77] text-base mt-1">
            Theo dõi cữ thuốc Sáng, Trưa, Tối tự động đồng bộ từ đơn thuốc & hỗ trợ thêm thủ công
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-extrabold text-sm flex items-center gap-2 shadow-button elderly-tap-target transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thuốc thủ công</span>
          </button>
          <button
            onClick={handleResetDay}
            className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm flex items-center gap-2 elderly-tap-target transition"
            title="Đặt lại trạng thái các cữ thuốc sang Chưa uống"
          >
            <RotateCcw className="w-4 h-4 text-gray-500" />
            <span>Ngày mới</span>
          </button>
          {schedules.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-sm flex items-center gap-1.5 elderly-tap-target transition"
              title="Xóa toàn bộ cữ thuốc hiện tại"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Xóa tất cả</span>
            </button>
          )}
          <TTSPlayer text={speechText} label="Nghe lịch thuốc" />
        </div>
      </div>

      {lastAction && (
        <div className="bg-[#DCFCE7] border-2 border-[#15803D] rounded-2xl p-4 text-[#15803D] font-extrabold flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{lastAction}</span>
        </div>
      )}

      {/* If No Medications, Render Friendly Empty State */}
      {schedules.length === 0 ? (
        <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-card">
          <div className="w-20 h-20 rounded-3xl bg-[#DDEEEB] text-[#0B6B73] flex items-center justify-center mx-auto text-3xl shadow-sm">
            <Pill className="w-10 h-10" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-2xl font-black text-[#073F46]">
              Chưa Có Lịch Uống Thuốc Nào
            </h3>
            <p className="text-base text-[#5B6B77] leading-relaxed">
              Danh sách hiện tại hoàn toàn trống. Bác có thể chụp đơn thuốc đã khám để AI tự động trích xuất các cữ thuốc, hoặc bấm nút thêm thuốc thủ công bên dưới.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/scan"
              className="bg-[#0B6B73] hover:bg-[#073F46] text-white px-7 py-3.5 rounded-2xl font-black text-base flex items-center gap-2 shadow-button transition elderly-tap-target"
            >
              <FileText className="w-5 h-5" />
              <span>Chụp / Quét Đơn Thuốc Mới</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-white border-2 border-[#0B6B73] hover:bg-[#F2F8F7] text-[#073F46] px-6 py-3.5 rounded-2xl font-bold text-base flex items-center gap-2 transition elderly-tap-target"
            >
              <Plus className="w-5 h-5 text-[#0B6B73]" />
              <span>Thêm Thuốc Thủ Công</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Daily Progress Tracker Card */}
          <div className="bg-gradient-to-r from-[#073F46] to-[#0B6B73] text-white rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  Tiến độ uống thuốc hôm nay
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-1">
                  Đã uống {takenDoses} / {totalDoses} cữ thuốc ({progressPercent}%)
                </h2>
              </div>

              <Link
                href="/history"
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-bold text-sm backdrop-blur-sm transition elderly-tap-target self-start sm:self-auto"
              >
                <FileText className="w-4 h-4" />
                <span>Xem Đơn Thuốc Đã Quét</span>
              </Link>
            </div>

            <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden p-0.5">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* SLOTS RENDER */}
          <div className="space-y-6">
            {/* Slot Sáng */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xl font-black text-amber-700">
                <Sun className="w-6 h-6 text-amber-500" />
                <span>Cữ Sáng (07:00 - 08:30)</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                  {morningList.length} loại
                </span>
              </div>

              {morningList.length === 0 ? (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium">
                  Không có thuốc cần uống vào cữ sáng.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {morningList.map((slot) => renderSlotCard(slot, handleMark, handleDelete))}
                </div>
              )}
            </div>

            {/* Slot Trưa */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xl font-black text-orange-700">
                <Sunset className="w-6 h-6 text-orange-500" />
                <span>Cữ Trưa (11:30 - 13:00)</span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full font-bold">
                  {noonList.length} loại
                </span>
              </div>

              {noonList.length === 0 ? (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium">
                  Không có thuốc cần uống vào cữ trưa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {noonList.map((slot) => renderSlotCard(slot, handleMark, handleDelete))}
                </div>
              )}
            </div>

            {/* Slot Tối */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xl font-black text-indigo-800">
                <Moon className="w-6 h-6 text-indigo-500" />
                <span>Cữ Tối (19:00 - 20:30)</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                  {eveningList.length} loại
                </span>
              </div>

              {eveningList.length === 0 ? (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium">
                  Không có thuốc cần uống vào cữ tối.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eveningList.map((slot) => renderSlotCard(slot, handleMark, handleDelete))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Manual Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#073F46]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#073F46]">Thêm Thuốc Thủ Công</h2>
                  <p className="text-xs text-gray-500 font-bold">Thêm trực tiếp vào lịch uống thuốc hôm nay</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedication} className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-[#073F46] mb-1">
                  Tên thuốc *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Panadol 500mg, Amlodipine..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0B6B73] focus:ring-2 focus:ring-[#0B6B73]/20 font-bold text-gray-800 outline-none text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-[#073F46] mb-1">
                  Liều lượng mỗi lần uống
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1 viên, 2 viên, 1 gói..."
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0B6B73] focus:ring-2 focus:ring-[#0B6B73]/20 font-bold text-gray-800 outline-none text-base"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {['1 viên', '2 viên', '1/2 viên', '1 gói'].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setNewDosage(d)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                        newDosage === d
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                          : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-[#073F46] mb-1">
                  Uống vào cữ nào? *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'morning', label: '🌅 Sáng', time: '07:30' },
                    { key: 'noon', label: '☀️ Trưa', time: '12:00' },
                    { key: 'evening', label: '🌙 Tối', time: '19:30' },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setNewSlot(s.key as any)}
                      className={`py-3 px-2 rounded-xl border-2 font-black text-center transition flex flex-col items-center gap-1 ${
                        newSlot === s.key
                          ? 'border-[#15803D] bg-emerald-50 text-[#15803D]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm">{s.label}</span>
                      <span className="text-xs font-semibold text-gray-500">{s.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-[#073F46] mb-1">
                  Hướng dẫn cách uống
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Uống sau khi ăn no với nước ấm..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0B6B73] focus:ring-2 focus:ring-[#0B6B73]/20 font-medium text-gray-800 outline-none text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    'Uống sau ăn no',
                    'Uống trước ăn 30p',
                    'Uống trước khi đi ngủ',
                    'Uống cùng nhiều nước ấm',
                  ].map((inst) => (
                    <button
                      type="button"
                      key={inst}
                      onClick={() => setNewInstructions(inst)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                        newInstructions === inst
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                          : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {inst}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-extrabold text-sm shadow-button transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Lưu Vào Lịch Uống</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function renderSlotCard(
  slot: ScheduleItem,
  onMark: (id: string, status: 'taken' | 'skipped') => void,
  onDelete: (id: string, name: string) => void
) {
  const isTaken = slot.status === 'taken';
  const isSkipped = slot.status === 'skipped';

  const cardSpeech = `${slot.name}. Liều lượng ${slot.dosage}. ${slot.instructions}.`;

  return (
    <div
      key={slot.id}
      className={`bg-white border-2 rounded-3xl p-6 transition shadow-card flex flex-col justify-between gap-5 ${
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

          <div className="flex items-center gap-2">
            <TTSPlayer text={cardSpeech} label="Nghe" />
            <button
              type="button"
              onClick={() => onDelete(slot.id, slot.name)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Xóa thuốc này khỏi lịch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
        </div>

        <div>
          <h3 className="text-xl font-black text-[#073F46] leading-snug">{slot.name}</h3>
          <div className="text-base font-bold text-[#14283A] mt-1.5">
            Liều lượng: <span className="text-[#0B6B73]">{slot.dosage}</span>
          </div>
          <p className="text-sm text-[#5B6B77] mt-1 font-medium">{slot.instructions}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onMark(slot.id, 'taken')}
          className={`flex-1 py-3.5 rounded-2xl font-black text-base transition flex items-center justify-center gap-2 elderly-tap-target ${
            isTaken
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-[#0B6B73] hover:bg-[#073F46] text-white shadow-button'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          <span>{isTaken ? '✓ Đã uống xong' : 'Bấm: Tôi đã uống'}</span>
        </button>

        {!isTaken && (
          <button
            type="button"
            onClick={() => onMark(slot.id, 'skipped')}
            className="px-4 py-3.5 rounded-2xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition elderly-tap-target"
          >
            Bỏ qua
          </button>
        )}
      </div>
    </div>
  );
}
