import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';

import { colors, fonts, spacing, borderRadius, fontWeights } from '../utils/theme';
import { Message } from '../utils/store';

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const time = format(new Date(message.timestamp), 'h:mm a');

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
          {renderContent(message.content)}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
        {time}
      </Text>
    </View>
  );
}

// Simple markdown-like rendering: bold (**text**) and line breaks
function renderContent(content: string): string {
  // For a real implementation, you would parse markdown and return
  // rich Text components. For the MVP, we return plain text.
  return content.replace(/\*\*(.*?)\*\*/g, '$1');
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    marginBottom: spacing.xs,
  },
  containerUser: {
    alignSelf: 'flex-end',
  },
  containerAssistant: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: fonts.base,
    lineHeight: 21,
  },
  textUser: {
    color: colors.white,
  },
  textAssistant: {
    color: colors.text,
  },
  timestamp: {
    fontSize: fonts.xs,
    marginTop: 2,
  },
  timestampUser: {
    color: colors.textLight,
    textAlign: 'right',
  },
  timestampAssistant: {
    color: colors.textLight,
    textAlign: 'left',
  },
});
