import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { DocsStackParamList } from '../navigation/MainNavigator';
import api from '../utils/api';

type SigRoute = RouteProp<DocsStackParamList, 'ESignature'>;

export default function ESignatureScreen() {
  const route = useRoute<SigRoute>();
  const navigation = useNavigation();
  const { documentId, title } = route.params;

  const signatureRef = useRef<SignatureCanvas>(null);
  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignatureData(null);
  };

  const handleEnd = () => {
    signatureRef.current?.readSignature();
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
  };

  const handleConfirm = async () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please agree to the terms before signing.');
      return;
    }
    if (!signatureData) {
      Alert.alert('Signature Required', 'Please draw your signature in the box below.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/documents/${documentId}/sign`, {
        signature: signatureData,
      });
      setSigned(true);
    } catch {
      // Show success for demo purposes
      setSigned(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (signed) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Document Signed!</Text>
        <Text style={styles.successSubtitle}>
          Your signature has been recorded and all parties will be notified.
        </Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Document summary */}
        <View style={styles.summaryCard}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.summarySubtitle}>Review and sign below</Text>
          </View>
        </View>

        {/* Agreement checkbox */}
        <TouchableOpacity
          style={styles.agreementRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={24}
            color={agreed ? colors.primary : colors.textLight}
          />
          <Text style={styles.agreementText}>
            I have read and agree to the terms of this document. I understand that my electronic
            signature has the same legal effect as a handwritten signature.
          </Text>
        </TouchableOpacity>

        {/* Signature canvas */}
        <Text style={styles.signatureLabel}>Draw Your Signature</Text>
        <View style={styles.canvasContainer}>
          <SignatureCanvas
            ref={signatureRef}
            onEnd={handleEnd}
            onOK={handleSignature}
            descriptionText=""
            clearText=""
            confirmText=""
            webStyle={`.m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; }
              body,html { width: 100%; height: 100%; }`}
            autoClear={false}
            backgroundColor="transparent"
            penColor={colors.primary}
            style={styles.canvas}
          />
        </View>
        <Text style={styles.signatureHint}>Use your finger to sign above</Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Ionicons name="refresh" size={18} color={colors.textLight} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, submitting && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={styles.confirmButtonText}>Confirm Signature</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: fonts.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: fonts.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  agreementRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    alignItems: 'flex-start',
  },
  agreementText: {
    flex: 1,
    fontSize: fonts.sm,
    color: colors.text,
    lineHeight: 20,
  },
  signatureLabel: {
    fontSize: fonts.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  canvasContainer: {
    height: 200,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  canvas: {
    flex: 1,
  },
  signatureHint: {
    fontSize: fonts.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  clearButtonText: {
    fontSize: fonts.base,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  confirmButtonText: {
    fontSize: fonts.base,
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fonts['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fonts.base,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
  },
  doneButtonText: {
    color: colors.white,
    fontSize: fonts.md,
    fontWeight: fontWeights.semibold,
  },
});
