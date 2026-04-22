import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';

interface Showing {
  id: string;
  scheduledAt: string;
  status: string;
  property?: { title?: string; address: string; city: string };
}

interface Transaction {
  id: string;
  status: string;
  offerPrice?: string;
  property?: { title?: string; address: string };
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showings, setShowings] = useState<Showing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [showRes, txRes, docRes] = await Promise.allSettled([
        api.get('/showings'),
        api.get('/transactions'),
        api.get('/documents'),
      ]);
      if (showRes.status === 'fulfilled') setShowings(showRes.value.data.showings || []);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data.transactions || []);
      if (docRes.status === 'fulfilled') setDocuments(docRes.value.data.documents || []);
    } catch {}
    setLoading(false);
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  }

  const statusColor = (s: string) => {
    if (s === 'confirmed' || s === 'completed' || s === 'fully_signed') return Colors.success;
    if (s === 'cancelled' || s === 'failed') return Colors.error;
    return Colors.warning;
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAuth}>
          <Ionicons name="person-circle-outline" size={64} color={Colors.textLight} />
          <Text style={styles.notAuthText}>Sign in to view your profile</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roleLabel = (r: string) => ({ buyer: 'Buyer', seller: 'Seller', landlord: 'Landlord', tenant: 'Tenant', agent: 'Agent' }[r] || r);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.fullName}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel(user.role)}</Text>
          </View>
          {user.phone && <Text style={styles.profilePhone}>{user.phone}</Text>}
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}

        {/* Agent Card */}
        <View style={styles.agentCard}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentAvatarText}>RR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>Rasha Rahaman</Text>
            <Text style={styles.agentTitle}>Your Licensed FL Realtor</Text>
            <Text style={styles.agentLicense}>West Palm Beach · CribAgents</Text>
          </View>
          <TouchableOpacity style={styles.agentChatBtn} onPress={() => router.push('/(tabs)/chat')}>
            <Ionicons name="chatbubbles" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Showings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Showings</Text>
            <Text style={styles.sectionCount}>{showings.length}</Text>
          </View>
          {showings.length === 0 ? (
            <Text style={styles.emptySection}>No scheduled showings yet. Ask the AI to schedule one!</Text>
          ) : (
            showings.slice(0, 3).map(s => (
              <View key={s.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{s.property?.address || 'Property'}</Text>
                  <Text style={styles.cardSub}>{s.property?.city || 'West Palm Beach'}</Text>
                  <Text style={styles.cardDate}>{new Date(s.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(s.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor(s.status) }]}>{s.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Transactions</Text>
            <Text style={styles.sectionCount}>{transactions.length}</Text>
          </View>
          {transactions.length === 0 ? (
            <Text style={styles.emptySection}>No active transactions yet.</Text>
          ) : (
            transactions.slice(0, 3).map(t => (
              <View key={t.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{t.property?.address || 'Property'}</Text>
                  {t.offerPrice && <Text style={styles.cardSub}>${parseInt(t.offerPrice).toLocaleString()}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(t.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor(t.status) }]}>{t.status.replace('_', ' ')}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Documents</Text>
            <Text style={styles.sectionCount}>{documents.length}</Text>
          </View>
          {documents.length === 0 ? (
            <Text style={styles.emptySection}>No documents yet. Generate contracts through the AI chat.</Text>
          ) : (
            documents.slice(0, 3).map(d => (
              <View key={d.id} style={styles.card}>
                <Ionicons name="document-text" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{d.title}</Text>
                  <Text style={styles.cardSub}>{d.type?.replace('_', ' ')}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(d.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor(d.status) }]}>{d.status?.replace('_', ' ')}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {[
            { icon: 'notifications-outline', label: 'Notifications', action: () => {} },
            { icon: 'shield-checkmark-outline', label: 'Privacy & Security', action: () => {} },
            { icon: 'help-circle-outline', label: 'Help & Support', action: () => {} },
            { icon: 'information-circle-outline', label: 'About CribAgents', action: () => {} },
          ].map(item => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action}>
              <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CribAgents v1.0 · Rasha Rahaman, Licensed FL Realtor</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notAuth: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  notAuthText: { fontSize: 16, color: Colors.textSecondary },
  signInBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  signInBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 15 },
  profileHeader: { backgroundColor: Colors.primary, alignItems: 'center', padding: Spacing.xl, paddingTop: Spacing.xxl },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  profileName: { fontSize: 20, fontWeight: '800', color: Colors.textInverse, marginBottom: 2 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xs },
  roleBadge: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4, marginBottom: 2 },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  profilePhone: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  loadingBox: { padding: Spacing.xl, alignItems: 'center' },
  agentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.lg, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  agentAvatarText: { color: Colors.textInverse, fontWeight: '800', fontSize: 14 },
  agentName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  agentTitle: { fontSize: 12, color: Colors.textSecondary },
  agentLicense: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  agentChatBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionCount: { fontSize: 13, color: Colors.textSecondary, backgroundColor: Colors.inputBg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  emptySection: { fontSize: 13, color: Colors.textLight, fontStyle: 'italic', paddingVertical: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cardDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  menuItemText: { flex: 1, fontSize: 14, color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: Colors.error + '10', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.error + '30' },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
  footer: { alignItems: 'center', paddingBottom: Spacing.xl },
  footerText: { fontSize: 11, color: Colors.textLight },
});
