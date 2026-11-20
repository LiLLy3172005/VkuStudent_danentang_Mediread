'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  ShieldAlert,
  Bot,
  User,
  HelpCircle,
  FileText,
  RotateCcw,
  Volume2,
  Stethoscope,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DocumentDetail, DocumentSummary } from '../../lib/types';
import { TTSPlayer } from '../../components/Footer';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Đường huyết 7.8 có cao không bác sĩ?',
  'Chỉ số Creatinin 115 phản ánh điều gì về thận?',
  'Mỡ máu cao thì tôi nên kiêng ăn những gì?',
  'Thuốc huyết áp nên uống vào lúc nào tốt nhất?',
  'Bạch cầu NEU% tăng nhẹ có đáng lo không?',
];

function AiChatInner() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('document_id') || undefined;
  const facilityParam = searchParams.get('facility') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(documentId);
  const [docDetail, setDocDetail] = useState<DocumentDetail | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages and load documents
  useEffect(() => {
    async function init() {
      // Fetch user documents to allow switching context
      try {
        const docs = await api.getDocuments();
        setDocuments(docs || []);
      } catch (e) {
        console.warn('Could not load documents for AI chat context', e);
      }

      // If documentId is present, fetch its details
      let initialGreeting = 'Dạ thưa bác, cháu là Bác Sĩ AI MediRead! Cháu luôn sẵn sàng giải thích cặn kẽ các chỉ số xét nghiệm máu, ý nghĩa đơn thuốc và tư vấn chế độ dinh dưỡng, sinh hoạt cho bác. Bác cần cháu giải đáp điều gì ạ?';
      if (documentId) {
        try {
          const detail = await api.getDocumentDetail(documentId);
          setDocDetail(detail);
          initialGreeting = `Dạ thưa bác, cháu là Bác Sĩ AI MediRead. Cháu đã nạp thông tin phiếu khám tại "${detail.facility_name || facilityParam || 'Cơ sở y tế'}". Bác cần cháu giải thích chỉ số xét nghiệm hoặc loại thuốc nào trên phiếu này ạ?`;
        } catch {
          // keep fallback
        }
      }

      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: initialGreeting,
          timestamp: 'Vừa xong',
          suggestions: DEFAULT_SUGGESTIONS,
        },
      ]);
    }

    init();
  }, [documentId, facilityParam]);

  // If selectedDocId changes
  useEffect(() => {
    if (selectedDocId && selectedDocId !== docDetail?.id) {
      api.getDocumentDetail(selectedDocId)
        .then((detail) => setDocDetail(detail))
        .catch(() => setDocDetail(null));
    } else if (!selectedDocId) {
      setDocDetail(null);
    }
  }, [selectedDocId, docDetail?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.chatDoctorAI(trimmed, selectedDocId);
      const reply = res.reply || 'Dạ thưa bác, cháu đã tiếp nhận câu hỏi của bác. Bác nên uống thuốc đúng giờ và tái khám theo hướng dẫn của bác sĩ nhé.';
      const newSuggestions = res.suggested_questions && res.suggested_questions.length > 0
        ? res.suggested_questions
        : DEFAULT_SUGGESTIONS;

      const aiMsg: ChatMessage = {
        id: 'ai-' + (Date.now() + 1),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestions: newSuggestions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setActiveSuggestions(newSuggestions);
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: 'ai-' + (Date.now() + 1),
        sender: 'ai',
        text: 'Dạ thưa bác, cháu đã ghi nhận câu hỏi. Để đảm bảo sức khỏe an toàn nhất, bác nhớ uống thuốc đúng giờ, ăn nhạt bớt muối, kiêng đồ ngọt và dầu mỡ, uống đủ nước ấm nhé. Khi tái khám, bác có thể trao đổi trực tiếp thêm với bác sĩ điều trị.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestions: DEFAULT_SUGGESTIONS,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    if (confirm('Bác có muốn xóa lịch sử cuộc trò chuyện này để bắt đầu câu hỏi mới không?')) {
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          sender: 'ai',
          text: 'Dạ thưa bác, cuộc trò chuyện đã được làm mới. Bác có thắc mắc gì về sức khỏe hay thuốc uống cứ hỏi cháu nhé!',
          timestamp: 'Vừa xong',
          suggestions: DEFAULT_SUGGESTIONS,
        },
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#DDEEEB]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white flex items-center justify-center text-2xl shadow-md">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#073F46]">
              Bác Sĩ AI MediRead
            </h1>
            <p className="text-sm text-[#5B6B77]">
              Trợ lý y khoa ân cần, giải thích kết quả xét nghiệm và hướng dẫn dùng thuốc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetChat}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition elderly-tap-target"
            title="Làm mới cuộc trò chuyện"
          >
            <RotateCcw className="w-4 h-4 text-gray-500" />
            <span>Làm mới</span>
          </button>
          <TTSPlayer
            text="Bác Sĩ AI MediRead sẵn sàng tư vấn và giải đáp các thắc mắc về xét nghiệm máu và đơn thuốc của bác. Bác có thể bấm vào các gợi ý có sẵn hoặc gõ câu hỏi vào ô bên dưới."
            label="Nghe hướng dẫn"
          />
        </div>
      </div>

      {/* Document Context Selector (if documents exist) */}
      {documents.length > 0 && (
        <div className="bg-[#F0FDF4] border-2 border-[#BBF7D0] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Ngữ cảnh phiếu khám:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDocId || ''}
              onChange={(e) => setSelectedDocId(e.target.value || undefined)}
              className="bg-white border-2 border-emerald-300 text-emerald-950 font-bold rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 w-full sm:w-auto"
            >
              <option value="">-- Tư vấn y khoa tổng quát (Không gắn phiếu) --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.facility_name || 'Phiếu khám'} ({d.doc_type === 'prescription' ? 'Đơn thuốc' : 'Xét nghiệm'}) - {d.created_at ? new Date(d.created_at).toLocaleDateString('vi-VN') : ''}
                </option>
              ))}
            </select>
            {selectedDocId && (
              <Link
                href={`/history/${selectedDocId}`}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs underline whitespace-nowrap"
              >
                Xem chi tiết phiếu
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Safety Disclaimer Banner */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs sm:text-sm text-amber-900 font-medium">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Lưu ý quan trọng:</strong> Bác Sĩ AI MediRead hỗ trợ giải thích giáo dục kiến thức y khoa, không thay thế việc chẩn đoán xác định hay kê đơn trực tiếp của bác sĩ chuyên khoa. Khi có triệu chứng cấp cứu, bác vui lòng liên hệ ngay 115 hoặc đến cơ sở y tế gần nhất.
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#073F46]">
          <HelpCircle className="w-4 h-4 text-[#0B6B73]" />
          <span>Bác có thể hỏi nhanh các câu hỏi thường gặp:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeSuggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(sug)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#DDEEEB] hover:border-[#0B6B73] hover:bg-[#F2F8F7] text-[#073F46] font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm elderly-tap-target text-left"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{sug}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Conversation Box */}
      <div className="bg-[#F8FAFA] border-2 border-[#DDEEEB] rounded-3xl p-4 sm:p-6 min-h-[420px] max-h-[580px] overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isAi
                    ? 'bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white'
                    : 'bg-[#DDEEEB] text-[#073F46]'
                }`}
              >
                {isAi ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-sm space-y-2.5 ${
                  isAi
                    ? 'bg-white border-2 border-[#DDEEEB] text-[#14283A]'
                    : 'bg-[#0B6B73] text-white font-medium'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs opacity-70 border-b pb-1">
                  <span className="font-bold">
                    {isAi ? 'Bác Sĩ AI MediRead' : 'Bác / Bạn'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium">
                  {msg.text}
                </p>

                {/* TTS Reader for AI Responses */}
                {isAi && (
                  <div className="pt-1 flex items-center justify-end">
                    <TTSPlayer text={msg.text} label="Nghe bác sĩ đọc" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Bot className="w-6 h-6" />
            </div>
            <div className="bg-white border-2 border-[#DDEEEB] rounded-3xl p-4 sm:p-5 shadow-sm text-sm text-[#0B6B73] font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B6B73] animate-ping"></span>
              <span>Bác Sĩ AI đang phân tích tài liệu y khoa và soạn câu trả lời cho bác...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="bg-white border-2 border-[#0B6B73] rounded-3xl p-2 sm:p-3 shadow-card flex items-center gap-2 sm:gap-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập câu hỏi của bác (Ví dụ: Đường huyết 7.8 có nguy hiểm không?)..."
          className="flex-1 bg-transparent px-3 py-3 text-base sm:text-lg font-bold text-[#14283A] placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="bg-[#0B6B73] hover:bg-[#073F46] disabled:opacity-40 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl font-black text-base flex items-center gap-2 shadow-button transition elderly-tap-target shrink-0"
        >
          <span>Gửi hỏi</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function AiChatPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-bold text-[#073F46]">Đang tải phòng khám Bác Sĩ AI...</div>}>
      <AiChatInner />
    </Suspense>
  );
}
