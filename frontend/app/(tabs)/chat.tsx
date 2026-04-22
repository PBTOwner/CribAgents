import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const QUICK_ACTIONS = [
  { label: 'Find homes under $500K', icon: 'home' },
  { label: 'Schedule a showing', icon: 'calendar' },
  { label: 'Calculate mortgage', icon: 'calculator' },
  { label: 'Market analysis', icon: 'trending-up' },
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI real estate assistant, working alongside Rasha Rahaman, your licensed Florida realtor in West Palm Beach.\n\nI can help you search for properties, schedule showings, analyze the market, generate contracts, and guide you through the entire buying or renting process. What are you looking for today?",
  createdAt: new Date().toISOString(),
};

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { loadConversations(); }, []);

  async function loadConversations() {
    try {
      const res = await api.get('/agent/conversations');
      setConversations(res.data.conversations || []);
      if (res.data.conversations?.length > 0) {
        const latest = res.data.conversations[0];
        await loadConversation(latest.id);
      }
    } catch {}
  }

  async function loadConversation(convId: string) {
    try {
      const res = await api.get(`/agent/conversations/${convId}/messages`);
      const msgs = (res.data.messages || []).filter((m: any) => m.role !== 'system');
      setMessages(msgs.length > 0 ? msgs : [WELCOME_MESSAGE]);
      setConversationId(convId);
    } catch {}
  }

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const res = await api.post('/agent/conversations', { title: 'New Chat' });
    const newId = res.data.conversation.id;
    setConversationId(newId);
    return newId;
  }

  async function handleSend(text?: string) {
    const content = (text || inputText).trim();
    if (!content || sending) return;
    setInputText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const convId = await ensureConversation();
      const res = await api.post(`/agent/conversations/${convId}/message`, { message: content });
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.data.response || "I'm processing your request...",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check that the backend is running and try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([WELCOME_MESSAGE]);
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>R</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentAvatarText}>R</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Rasha's AI Realtor</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online · West Palm Beach</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsLabel}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a, i) => (
              <TouchableOpacity key={i} style={styles.quickChip} onPress={() => handleSend(a.label)}>
                <Ionicons name={a.icon as any} size={14} color={Colors.primary} />
                <Text style={styles.quickChipText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Sending indicator */}
      {sending && (
        <View style={styles.typingRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about West Palm Beach real estate..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons name="send" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  agentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  agentAvatarText: { color: Colors.textInverse, fontWeight: '700', fontSize: 16 },
  headerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { fontSize: 11, color: Colors.textSecondary },
  newChatBtn: { padding: Spacing.xs },
  quickActions: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  quickActionsLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  quickChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  quickChipText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  msgList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginBottom: Spacing.xs },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: Colors.textInverse, fontWeight: '700', fontSize: 12 },
  bubble: { maxWidth: '75%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  bubbleAI: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: Radius.sm },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: Radius.sm },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTextUser: { color: Colors.textInverse },
  bubbleTime: { fontSize: 10, color: Colors.textLight, marginTop: 4, textAlign: 'right' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.6)' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  typingText: { fontSize: 13, color: Colors.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 14, color: Colors.text, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.textLight },
});
