import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, fonts, spacing, borderRadius, fontWeights } from '../utils/theme';
import { DocsStackParamList } from '../navigation/MainNavigator';
import api from '../utils/api';

type ViewerRoute = RouteProp<DocsStackParamList, 'DocumentViewer'>;
type ViewerNav = NativeStackNavigationProp<DocsStackParamList, 'DocumentViewer'>;

interface DocumentDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  content: string;
  parties: string[];
  signatures: { name: string; signedAt: string }[];
}

const MOCK_DOCUMENT: DocumentDetail = {
  id: '1',
  title: 'Purchase Agreement - 1245 Ocean Blvd',
  type: 'purchase_agreement',
  status: 'pending_signature',
  parties: ['John Smith (Buyer)', 'Rasha - CribAgents (Agent)'],
  signatures: [
    { name: 'John Smith', signedAt: '2026-04-20T14:30:00Z' },
  ],
  content: `RESIDENTIAL PURCHASE AND SALE AGREEMENT

THIS AGREEMENT is entered into as of April 18, 2026, by and between:

BUYER: John Smith ("Buyer")
SELLER: West Palm Holdings LLC ("Seller")
PROPERTY: 1245 Ocean Blvd, West Palm Beach, FL 33401

1. PURCHASE PRICE
The Buyer agrees to purchase the Property for the total price of EIGHT HUNDRED SEVENTY-FIVE THOUSAND DOLLARS ($875,000.00).

2. EARNEST MONEY DEPOSIT
Buyer shall deposit $25,000.00 as earnest money within three (3) business days of the Effective Date, to be held in escrow by the Closing Agent.

3. FINANCING
This Agreement is contingent upon Buyer obtaining a conventional mortgage loan in the amount of $700,000.00 at a fixed interest rate not to exceed 6.5% per annum with a 30-year term.

4. INSPECTION PERIOD
Buyer shall have fifteen (15) calendar days from the Effective Date to conduct inspections. Buyer may terminate this Agreement within the Inspection Period for any reason.

5. CLOSING DATE
Closing shall occur on or before June 18, 2026, unless extended by mutual written agreement.

6. TITLE
Seller shall convey marketable title to the Property by general warranty deed, free and clear of all liens and encumbrances except as otherwise accepted by Buyer.

7. PROPERTY CONDITION
Seller represents that the Property, including all fixtures, appliances, and systems, will be in working condition at closing.

8. CLOSING COSTS
Seller shall pay: documentary stamps on the deed, owner's title insurance, and Seller's attorney fees.
Buyer shall pay: mortgage-related costs, lender's title insurance, recording fees, and Buyer's attorney fees.

9. BROKERAGE
CribAgents Realty, represented by Rasha (License #BK3456789), serves as the transaction broker. Commission of 6% of the purchase price shall be paid at closing.

10. DEFAULT
If Buyer defaults, Seller may retain the earnest money deposit as liquidated damages. If Seller defaults, Buyer may seek specific performance or return of earnest money.

This Agreement constitutes the entire agreement between the parties and may be modified only in writing signed by all parties.

SIGNATURES:
________________________     ________________________
John Smith (Buyer)           West Palm Holdings LLC (Seller)
Date: ___________            Date: ___________

________________________
Rasha, Transaction Broker
CribAgents Realty
Date: ___________`,
};

export default function DocumentViewerScreen() {
  const route = useRoute<ViewerRoute>();
  const navigation = useNavigation<ViewerNav>();
  const { documentId, title } = route.params;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocument();
  }, []);

  const loadDocument = async () => {
    try {
      const res = await api.get(`/documents/${documentId}`);
      setDocument(res.data.document);
    } catch {
      // Fallback to mock
      setDocument(MOCK_DOCUMENT);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Could not load document</Text>
      </View>
    );
  }

  const isPendingSignature = document.status === 'pending_signature';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Document meta */}
        <View style={styles.metaRow}>
          <Text style={styles.docType}>{document.type.replace(/_/g, ' ').toUpperCase()}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  document.status === 'signed'
                    ? colors.success + '20'
                    : document.status === 'pending_signature'
                    ? colors.warning + '20'
                    : colors.textLight + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    document.status === 'signed'
                      ? colors.success
                      : document.status === 'pending_signature'
                      ? colors.warning
                      : colors.textLight,
                },
              ]}
            >
              {document.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesSection}>
          <Text style={styles.partiesTitle}>Parties</Text>
          {document.parties.map((party, i) => (
            <View key={i} style={styles.partyRow}>
              <Ionicons name="person-outline" size={16} color={colors.textLight} />
              <Text style={styles.partyName}>{party}</Text>
            </View>
          ))}
        </View>

        {/* Existing signatures */}
        {document.signatures.length > 0 && (
          <View style={styles.signaturesSection}>
            <Text style={styles.signaturesTitle}>Signatures</Text>
            {document.signatures.map((sig, i) => (
              <View key={i} style={styles.signatureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.signatureName}>{sig.name}</Text>
                <Text style={styles.signatureDate}>
                  {new Date(sig.signedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Document content */}
        <View style={styles.documentContainer}>
          <Text style={styles.documentText}>{document.content}</Text>
        </View>
      </ScrollView>

      {/* Sign button */}
      {isPendingSignature && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.signButton}
            onPress={() =>
              navigation.navigate('ESignature', { documentId: document.id, title: document.title })
            }
          >
            <Ionicons name="create" size={20} color={colors.white} />
            <Text style={styles.signButtonText}>Sign Document</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fonts.md,
    color: colors.error,
  },
  content: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  docType: {
    fontSize: fonts.xs,
    fontWeight: fontWeights.bold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fonts.xs,
    fontWeight: fontWeights.semibold,
    textTransform: 'capitalize',
  },
  partiesSection: {
    marginBottom: spacing.base,
  },
  partiesTitle: {
    fontSize: fonts.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  partyName: {
    fontSize: fonts.sm,
    color: colors.text,
  },
  signaturesSection: {
    marginBottom: spacing.base,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  signaturesTitle: {
    fontSize: fonts.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  signatureName: {
    flex: 1,
    fontSize: fonts.sm,
    color: colors.text,
  },
  signatureDate: {
    fontSize: fonts.xs,
    color: colors.textLight,
  },
  documentContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentText: {
    fontSize: fonts.sm,
    color: colors.text,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  signButtonText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fontWeights.semibold,
  },
});
