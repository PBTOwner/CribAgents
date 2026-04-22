import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import SignatureCanvas from '../../components/SignatureCanvas';

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  content?: string;
  createdAt: string;
}

export default function ESignatureScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => { loadDocument(); }, [docId]);

  async function loadDocument() {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${docId}`);
      setDoc(res.data.document);
    } catch {
      Alert.alert('Error', 'Could not load document.', [
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitSignature() {
    if (!signatureSvg) {
      Alert.alert('Signature Required', 'Please sign in the signature box before submitting.');
      return;
    }
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please confirm that you agree to sign this document electronically.');
      return;
    }
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to sign documents.');
      return;
    }

    setSubmitting(true);
    try {
      const svgBase64 = `data:image/svg+xml;base64,${btoa(signatureSvg)}`;
      await api.post(`/documents/${docId}/sign`, {
        signatureData: svgBase64,
        signerName: user.fullName,
        signerEmail: user.email,
      });
      Alert.alert(
        'Document Signed!',
        'Your signature has been recorded. You will receive a copy via email once all parties have signed.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to submit signature. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doc) return null;

  const canvasWidth = Math.min(width - Spacing.lg * 2, 340);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{doc.title}</Text>
          <Text style={styles.headerSub}>{doc.type?.replace(/_/g, ' ')} · {doc.status?.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Document Status */}
        <View style={[styles.statusBanner, doc.status === 'fully_signed' ? styles.signedBanner : styles.pendingBanner]}>
          <Ionicons
            name={doc.status === 'fully_signed' ? 'checkmark-circle' : 'time-outline'}
            size={18}
            color={doc.status === 'fully_signed' ? Colors.success : Colors.warning}
          />
          <Text style={[styles.statusBannerText, { color: doc.status === 'fully_signed' ? Colors.success : Colors.warning }]}>
            {doc.status === 'fully_signed' ? 'Fully Executed' : doc.status === 'pending_signatures' ? 'Awaiting Signatures' : doc.status?.replace(/_/g, ' ')}
          </Text>
        </View>

        {/* Document Preview */}
        <View style={styles.docCard}>
          <View style={styles.docHeader}>
            <Ionicons name="document-text" size={24} color={Colors.primary} />
            <Text style={styles.docTitle}>{doc.title}</Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={styles.docMetaText}>Type: {doc.type?.replace(/_/g, ' ')}</Text>
            <Text style={styles.docMetaText}>Created: {new Date(doc.createdAt).toLocaleDateString()}</Text>
          </View>
          {doc.content && (
            <ScrollView style={styles.docContent} nestedScrollEnabled>
              <Text style={styles.docContentText}>{doc.content}</Text>
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.pdfBtn}
            onPress={() => Alert.alert('PDF Download', 'PDF viewing requires a native PDF viewer. The document has been loaded successfully.')}
          >
            <Ionicons name="download-outline" size={16} color={Colors.primary} />
            <Text style={styles.pdfBtnText}>View Full PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Signature Section */}
        {doc.status !== 'fully_signed' && (
          <View style={styles.signSection}>
            <Text style={styles.signTitle}>Your Electronic Signature</Text>
            <Text style={styles.signInstructions}>
              Draw your signature below. By signing, you agree to the terms of this document. Your IP address, timestamp, and signature will be recorded for legal validity.
            </Text>

            <SignatureCanvas
              onSignatureChange={setSignatureSvg}
              width={canvasWidth}
              height={160}
            />

            {/* Agreement Checkbox */}
            <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)}>
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkText}>
                I, <Text style={{ fontWeight: '700' }}>{user?.fullName || 'Signatory'}</Text>, agree to sign this document electronically and acknowledge this constitutes a legally binding signature.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, (!signatureSvg || !agreed || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmitSignature}
              disabled={!signatureSvg || !agreed || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Signature</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {doc.status === 'fully_signed' && (
          <View style={styles.signedCard}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.success} />
            <Text style={styles.signedTitle}>Document Fully Executed</Text>
            <Text style={styles.signedSub}>All parties have signed this document. It is now legally binding.</Text>
          </View>
        )}

        {/* Legal Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            CribAgents uses industry-standard electronic signature technology. Electronic signatures are legally valid under Florida Statutes §668.50 (UETA) and the federal E-SIGN Act. Rasha Rahaman, Licensed FL Realtor.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, textTransform: 'capitalize' },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  signedBanner: { backgroundColor: Colors.success + '15' },
  pendingBanner: { backgroundColor: Colors.warning + '15' },
  statusBannerText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  docTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  docMeta: { gap: 4, marginBottom: Spacing.md },
  docMetaText: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  docContent: { maxHeight: 200, backgroundColor: Colors.background, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  docContentText: { fontSize: 12, color: Colors.text, lineHeight: 18 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  pdfBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  signSection: { marginBottom: Spacing.lg, alignItems: 'center' },
  signTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs, alignSelf: 'flex-start' },
  signInstructions: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: Spacing.lg, alignSelf: 'flex-start' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, flex: 1 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  signedCard: { alignItems: 'center', backgroundColor: Colors.success + '10', borderRadius: Radius.md, padding: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.success + '30' },
  signedTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  signedSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  disclaimer: { backgroundColor: Colors.inputBg, borderRadius: Radius.sm, padding: Spacing.md },
  disclaimerText: { fontSize: 11, color: Colors.textLight, lineHeight: 16, textAlign: 'center' },
});
