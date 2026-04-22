import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import ChatBubble from '../components/ChatBubble';
import ActionCard from '../components/ActionCard';
import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { useStore, Message, Conversation } from '../utils/store';
import { HomeStackParamList } from '../navigation/MainNavigator';

type ChatRoute = RouteProp<HomeStackParamList, 'AIChat'>;

const QUICK_ACTIONS = [
  { label: 'Search Properties', icon: 'search' as const },
  { label: 'Schedule Showing', icon: 'calendar' as const },
  { label: 'Create Offer', icon: 'document-text' as const },
  { label: 'Market Analysis', icon: 'trending-up' as const },
];

// Mock messages for illustration
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    conversationId: 'conv1',
    role: 'assistant',
    content:
      "Hello! I'm your AI real estate assistant, working alongside Rasha, your licensed Florida realtor. How can I help you today? I can search properties, schedule showings, create offers, or provide market analysis for West Palm Beach.",
    timestamp: '2026-04-21T09:00:00Z',
  },
];

export default function AIChatScreen() {
  const route = useRoute<ChatRoute>();
  const propertyContext = route.params?.propertyContext;

  const {
    currentMessages,
    messagesLoading,
    conversations,
    conversationsLoading,
    sendMessage,
    fetchConversations,
    fetchMessages,
    startNewConversation,
  } = useStore();

  const [inputText, setInputText] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const displayMessages = currentMessages.length > 0 ? currentMessages : MOCK_MESSAGES;

  useEffect(() => {
    fetchConversations();
    if (propertyContext) {
      // Auto-send context message
      const contextMsg = `I'd like to know more about the property at ${propertyContext.address}, ${propertyContext.city} — listed at $${propertyContext.price.toLocaleString()}.`;
      setInputText(contextMsg);
    }
  }, []);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendMessage(text);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleQuickAction = (label: string) => {
    setInputText(label);
    // Could auto-send; for now, just pre-fill
  };

  const handleSelectConversation = (conv: Conversation) => {
    setShowConversations(false);
    fetchMessages(conv.id);
  };

  const handleNewConversation = () => {
    setShowConversations(false);
    startNewConversation();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View>
        <ChatBubble message={item} />
        {item.action && <ActionCard action={item.action} />}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header actions */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowConversations(true)}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          <Text style={styles.headerButtonText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={handleNewConversation}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.headerButtonText}>New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      {displayMessages.length <= 1 && (
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionChip}
              onPress={() => handleQuickAction(action.label)}
            >
              <Ionicons name={action.icon} size={16} color={colors.primary} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Typing indicator */}
      {messagesLoading && (
        <View style={styles.typingRow}>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={colors.textLight} />
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask me anything about real estate..."
          placeholderTextColor={colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Conversation history modal */}
      <Modal visible={showConversations} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Conversations</Text>
            <TouchableOpacity onPress={() => setShowConversations(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.newConvButton} onPress={handleNewConversation}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.newConvButtonText}>New Conversation</Text>
          </TouchableOpacity>
          {conversationsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : conversations.length === 0 ? (
            <View style={styles.emptyConvs}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyConvsText}>No previous conversations</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.convItem}
                  onPress={() => handleSelectConversation(item)}
                >
                  <Text style={styles.convTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.convPreview} numberOfLines={2}>
                    {item.lastMessage}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButtonText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  messagesList: {
    padding: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  typingRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  typingText: {
    fontSize: fonts.sm,
    color: colors.textLight,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: fonts.base,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fonts.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  newConvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    margin: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  newConvButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fontWeights.semibold,
  },
  emptyConvs: {
    alignItems: 'center',
    marginTop: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyConvsText: {
    fontSize: fonts.base,
    color: colors.textLight,
  },
  convItem: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  convTitle: {
    fontSize: fonts.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  convPreview: {
    fontSize: fonts.sm,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
});
