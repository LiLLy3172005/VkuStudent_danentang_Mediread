import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../theme/colors';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import { api } from '../../services/api';
import { Sparkles, Send, ShieldAlert, Bot, User, HelpCircle } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Đường huyết 7.8 có cao không?',
  'Creatinin phản ánh chức năng thận ra sao?',
  'Mỡ máu cao nên ăn uống thế nào?',
  'Thuốc huyết áp nên uống lúc nào?',
];

export default function AiChatScreen() {
  const params = useLocalSearchParams<{ documentId?: string; docType?: string; facility?: string }>();
  const scrollViewRef = useRef<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: params.documentId
        ? `Cháu chào bác! Cháu là Bác Sĩ AI của MediRead. Cháu đã nạp thông tin phiếu khám tại "${params.facility || 'cơ sở y tế'}". Bác cần cháu giải thích chỉ số xét nghiệm hoặc loại thuốc nào trên phiếu này ạ?`
        : 'Cháu chào bác! Cháu là Bác Sĩ AI y khoa của MediRead. Bác có thắc mắc gì về chỉ số xét nghiệm sinh hóa hoặc hướng dẫn uống thuốc thì cứ hỏi cháu nhé!',
      timestamp: 'Vừa xong',
      suggestions: DEFAULT_SUGGESTIONS,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  const sendMessage = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: trimmed,
      timestamp: 'Vừa xong',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Call actual backend AI Doctor API
      const res = await api.chatDoctorAI(trimmed, params.documentId);
      const aiReply = res.reply || 'Cháu đã ghi nhận câu hỏi của bác. Bác nên duy trì lối sống lành mạnh và tái khám theo lịch hẹn nhé.';
      const newSuggestions = res.suggested_questions && res.suggested_questions.length > 0
        ? res.suggested_questions
        : DEFAULT_SUGGESTIONS;

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiReply,
        timestamp: 'Vừa xong',
        suggestions: newSuggestions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setActiveSuggestions(newSuggestions);
    } catch {
      // Fallback empathetic response
      const fallbackMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: 'Dạ thưa bác, cháu đã tiếp nhận câu hỏi. Để đảm bảo an toàn, bác nhớ uống thuốc đúng giờ theo đơn bác sĩ, ăn nhạt, kiêng ngọt và uống đủ nước ấm mỗi ngày nhé!',
        timestamp: 'Vừa xong',
        suggestions: DEFAULT_SUGGESTIONS,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const handleSend = () => {
    sendMessage(inputText);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar
        title="Bác Sĩ AI MediRead"
        subtitle={params.documentId ? 'Tư vấn theo phiếu khám đang xem' : 'Giải thích chỉ số y khoa dễ hiểu'}
        showBack
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Medical Disclaimer Banner */}
          <View style={styles.disclaimerBanner}>
            <ShieldAlert size={16} color="#C2410C" />
            <Text style={styles.disclaimerText}>
              Lưu ý: Bác Sĩ AI chỉ hỗ trợ giải thích giáo dục sức khỏe, không thay thế chẩn đoán hay đơn thuốc trực tiếp của bác sĩ điều trị.
            </Text>
          </View>

          {/* Quick Suggestions Chips */}
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeader}>
              <HelpCircle size={14} color={Colors.primary} />
              <Text style={styles.suggestionsTitle}>Bác có thể hỏi nhanh:</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {activeSuggestions.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(item)}
                  activeOpacity={0.7}
                >
                  <Sparkles size={12} color={Colors.primary} />
                  <Text style={styles.suggestionChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Messages List */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === 'user' ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              {msg.sender === 'ai' && (
                <View style={styles.aiAvatar}>
                  <Bot size={18} color="#FFFFFF" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === 'user' ? styles.messageTextUser : styles.messageTextAi,
                  ]}
                >
                  {msg.text}
                </Text>

                {msg.sender === 'ai' && (
                  <View style={styles.bubbleActionRow}>
                    <TTSButton text={msg.text} label="Nghe đọc" compact />
                  </View>
                )}
              </View>

              {msg.sender === 'user' && (
                <View style={styles.userAvatar}>
                  <User size={18} color="#FFFFFF" />
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={styles.typingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Bác sĩ AI đang tra cứu câu trả lời y khoa...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Hỏi bác sĩ AI về đường huyết, mỡ máu, thuốc..."
            placeholderTextColor={Colors.textSubtle}
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 12,
    borderRadius: 14,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 17,
    fontWeight: '600',
  },
  suggestionsSection: {
    gap: 8,
    marginVertical: 4,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  chipsScroll: {
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageTextAi: {
    color: Colors.textMain,
    fontWeight: '500',
  },
  bubbleActionRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  typingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: Colors.textMain,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textSubtle,
  },
});
