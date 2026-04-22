import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';

interface ActionCardProps {
  action: {
    type: 'showing_scheduled' | 'offer_created' | 'market_analysis' | 'property_found';
    data: Record<string, unknown>;
  };
}

const ACTION_CONFIG: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    accent: string;
    buttonLabel: string;
  }
> = {
  showing_scheduled: {
    icon: 'calendar',
    title: 'Showing Scheduled',
    accent: colors.success,
    buttonLabel: 'View Details',
  },
  offer_created: {
    icon: 'document-text',
    title: 'Offer Created',
    accent: colors.info,
    buttonLabel: 'Review Offer',
  },
  market_analysis: {
    icon: 'trending-up',
    title: 'Market Analysis',
    accent: colors.secondary,
    buttonLabel: 'View Full Report',
  },
  property_found: {
    icon: 'home',
    title: 'Property Found',
    accent: colors.primary,
    buttonLabel: 'View Property',
  },
};

export default function ActionCard({ action }: ActionCardProps) {
  const config = ACTION_CONFIG[action.type] || ACTION_CONFIG.property_found;
  const data = action.data;

  return (
    <View style={[styles.card, { borderLeftColor: config.accent }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: config.accent + '20' }]}>
          <Ionicons name={config.icon} size={18} color={config.accent} />
        </View>
        <Text style={styles.title}>{config.title}</Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        {data.date && (
          <DetailRow label="Date" value={String(data.date)} />
        )}
        {data.time && (
          <DetailRow label="Time" value={String(data.time)} />
        )}
        {data.property && (
          <DetailRow label="Property" value={String(data.property)} />
        )}
        {data.price && (
          <DetailRow label="Price" value={String(data.price)} />
        )}
        {data.summary && (
          <Text style={styles.summary}>{String(data.summary)}</Text>
        )}
      </View>

      {/* Action button */}
      <TouchableOpacity style={[styles.actionButton, { backgroundColor: config.accent }]}>
        <Text style={styles.actionButtonText}>{config.buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  details: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: fonts.sm,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  detailValue: {
    fontSize: fonts.sm,
    color: colors.text,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  summary: {
    fontSize: fonts.sm,
    color: colors.text,
    lineHeight: 18,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: fonts.sm,
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
});
