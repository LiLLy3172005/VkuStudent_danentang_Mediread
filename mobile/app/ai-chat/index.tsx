import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { HeaderBar } from '../../components/common/HeaderBar';
import { TTSButton } from '../../components/common/TTSButton';
import { Sparkles, Send, ShieldAlert, Bot, User } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AiChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Cháu chào bác! Cháu là trợ lý AI y khoa của MediRead. Bác có thắc mắc gì về chỉ số xét nghiệm hoặc cách uống thuốc thì cứ hỏi cháu nhé!',
      timestamp: 'Vừa xong',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: inputText.trim(),
      timestamp: 'Vừa xong',
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = inputText.trim();
    setInputText('');
    setLoading(true);

    // Simulated RAG clinical response based on Vietnamese clinical knowledge
    setTimeout(() => {
      let aiReply = 'Cháu đã ghi nhận câu hỏi của bác. Theo tài liệu y khoa chính thống, bác nên tuân thủ chế độ uống thuốc đúng giờ và tái khám theo hẹn của bác sĩ để được kiểm tra trực tiếp.';

      const lower = query.toLowerCase();
      if (lower.includes('đường') || lower.includes('glucose') || lower.includes('tiểu đường')) {
        aiReply = 'Về chỉ số đường huyết (Glucose): Ngưỡng an toàn lúc đói thường từ 3.9 đến 6.4 mmol/L. Nếu chỉ số của bác cao hơn mức này, bác nên giảm bớt đồ ngọt, bánh kẹo, cơm trắng và đi bộ nhẹ nhàng 20 phút mỗi ngày nhé.';
      } else if (lower.includes('cholesterol') || lower.includes('mỡ máu')) {
        aiReply = 'Về mỡ máu (Cholesterol toàn phần): Khoảng chuẩn thường dưới 5.2 mmol/L. Khi mỡ máu tăng, bác nên hạn chế mỡ động vật, phủ tạng và đồ chiên rán, thay vào đó nên ăn nhiều rau xanh và cá.';
      } else if (lower.includes('huyết áp')) {
        aiReply = 'Về huyết áp: Mức huyết áp tối ưu cho người lớn tuổi là dưới 130/80 mmHg. Bác nhớ uống thuốc huyết áp đều đặn mỗi sáng theo đơn của bác sĩ, không tự ý ngưng thuốc khi thấy khỏe nhé.';
      }

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiReply,
        timestamp: 'Vừa xong',
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Trợ Lý Y Khoa AI" subtitle="Giải thích dễ hiểu dựa trên dược thư HMU" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.chatContainer}>
          {/* Medical Disclaimer Banner */}
          <View style={styles.disclaimerBanner}>
            <ShieldAlert size={16} color="#C2410C" />
            <Text style={styles.disclaimerText}>
              Lưu ý: AI chỉ hỗ trợ giải thích giáo dục y khoa, tuyệt đối không thay thế chỉ định của bác sĩ điều trị.
            </Text>
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
                    <TTSButton text={msg.text} label="Nghe" compact />
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
              <Text style={styles.typingText}>Bác sĩ AI đang tra cứu câu trả lời...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Hỏi về đường huyết, mỡ máu, thuốc..."
            placeholderTextColor={Colors.textSubtle}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
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
    gap: 12,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningBg,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2D12',
    flex: 1,
    lineHeight: 16,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAi: {
    color: Colors.textMain,
  },
  bubbleActionRow: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  typingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: Colors.textMain,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
