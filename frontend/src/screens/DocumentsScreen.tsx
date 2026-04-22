import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { DocsStackParamList } from '../navigation/MainNavigator';
import api from '../utils/api';

type DocsNav = NativeStackNavigationProp<DocsStackParamList, 'DocsMain'>;

interface Document {
  id: string;
  title: string;
  type: 'purchase_agreement' | 'lease' | 'disclosure' | 'addendum' | 'other';
  status: 'draft' | 'pending_signature' | 'signed' | 'expired';
  parties: string[];
  createdAt: string;
  updatedAt: string;
}

const TABS = ['All', 'Pending Signature', 'Signed', 'Drafts'] as const;

const TAB_STATUS_MAP: Record<string, string | undefined> = {
  All: undefined,
  'Pending Signature': 'pending_signature',
  Signed: 'signed',
  Drafts: 'draft',
};

const TYPE_LABELS: Record<string, string> = {
  purchase_agreement: 'Purchase Agreement',
  lease: 'Lease',
  disclosure: 'Disclosure',
  addendum: 'Addendum',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  draft: colors.textLight,
  pending_signature: colors.warning,
  signed: colors.success,
  expired: colors.error,
};

// Mock data
const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'Purchase Agreement - 1245 Ocean Blvd',
    type: 'purchase_agreement',
    status: 'pending_signature',
    parties: ['John Smith', 'Rasha - CribAgents'],
    createdAt: '2026-04-18T10:00:00Z',
    updatedAt: '2026-04-20T14:00:00Z',
  },
  {
    id: '2',
    title: 'Lease Agreement - 500 S Rosemary Ave #1204',
    type: 'lease',
    status: 'signed',
    parties: ['Jane Doe', 'Property Owner LLC'],
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-15T11:00:00Z',
  },
  {
    id: '3',
    title: 'Seller Disclosure - 4521 Flagler Dr',
    type: 'disclosure',
    status: 'draft',
    parties: ['Michael Johnson'],
    createdAt: '2026-04-20T16:00:00Z',
    updatedAt: '2026-04-20T16:00:00Z',
  },
  {
    id: '4',
    title: 'Inspection Addendum - 320 30th St',
    type: 'addendum',
    status: 'pending_signature',
    parties: ['Sarah Williams', 'Rasha - CribAgents'],
    createdAt: '2026-04-19T08:00:00Z',
    updatedAt: '2026-04-21T09:00:00Z',
  },
];

export default function DocumentsScreen() {
  const navigation = useNavigation<DocsNav>();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const status = TAB_STATUS_MAP[activeTab];
      const res = await api.get('/documents', { params: status ? { status } : {} });
      setDocuments(res.data.documents);
    } catch {
      // Use mock data as fallback
      const status = TAB_STATUS_MAP[activeTab];
      setDocuments(
        status ? MOCK_DOCUMENTS.filter((d) => d.status === status) : MOCK_DOCUMENTS
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs =
    activeTab === 'All'
      ? documents
      : documents.filter((d) => d.status === TAB_STATUS_MAP[activeTab]);

  const handleDocumentPress = (doc: Document) => {
    navigation.navigate('DocumentViewer', { documentId: doc.id, title: doc.title });
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleDocumentPress(item)}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
              </View>
              <View style={styles.badgesRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.type] || item.type}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[item.status] + '20' },
                  ]}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]}
                  />
                  <Text
                    style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status] }]}
                  >
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardParties}>
                Parties: {item.parties.join(', ')}
              </Text>
              <Text style={styles.cardDate}>
                Updated {format(new Date(item.updatedAt), 'MMM d, yyyy')}
              </Text>
              {/* Quick actions */}
              <View style={styles.quickActions}>
                {item.status === 'pending_signature' && (
                  <TouchableOpacity style={styles.quickActionButton}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.quickActionText}>Sign</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.quickActionButton}>
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={styles.quickActionText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <Ionicons name="share-outline" size={16} color={colors.primary} />
                  <Text style={styles.quickActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No documents found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fonts.xs,
    fontWeight: fontWeights.medium,
    color: colors.textLight,
  },
  tabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fonts.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  typeBadgeText: {
    fontSize: fonts.xs,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: fonts.xs,
    fontWeight: fontWeights.medium,
    textTransform: 'capitalize',
  },
  cardParties: {
    fontSize: fonts.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  cardDate: {
    fontSize: fonts.xs,
    color: colors.textLight,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fonts.base,
    color: colors.textLight,
  },
});
