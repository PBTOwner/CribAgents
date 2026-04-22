import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { useStore } from '../utils/store';

export default function ProfileScreen() {
  const { user, logout } = useStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const displayUser = user || {
    fullName: 'Rasha',
    email: 'rashar1229@gmail.com',
    phone: '(561) 555-0123',
    role: 'agent',
    avatarUrl: null,
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar and name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {displayUser.avatarUrl ? (
            <Image source={{ uri: displayUser.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {displayUser.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{displayUser.fullName}</Text>
        <Text style={styles.userRole}>{displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}</Text>
      </View>

      {/* Contact info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <InfoRow icon="mail-outline" label="Email" value={displayUser.email} />
        <InfoRow icon="call-outline" label="Phone" value={displayUser.phone} />
      </View>

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <MenuRow icon="home-outline" label="My Listings" count={3} onPress={() => {}} />
        <MenuRow icon="document-text-outline" label="My Offers" count={1} onPress={() => {}} />
        <MenuRow icon="calendar-outline" label="Showing History" count={5} onPress={() => {}} />
        <MenuRow icon="card-outline" label="Payment History" onPress={() => {}} />
      </View>

      {/* Edit Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuRow icon="person-outline" label="Edit Profile" onPress={() => {}} />
        <MenuRow icon="key-outline" label="Change Password" onPress={() => {}} />
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color={colors.textLight} />
            <Text style={styles.settingLabel}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={20} color={colors.textLight} />
            <Text style={styles.settingLabel}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.versionText}>CribAgents v1.0.0</Text>
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textLight} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  count,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.textLight} />
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: fonts['4xl'],
    fontWeight: fontWeights.bold,
    color: colors.secondary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userName: {
    fontSize: fonts.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  userRole: {
    fontSize: fonts.base,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.sm,
    fontWeight: fontWeights.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fonts.xs,
    color: colors.textLight,
  },
  infoValue: {
    fontSize: fonts.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    fontSize: fonts.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  countText: {
    fontSize: fonts.xs,
    color: colors.white,
    fontWeight: fontWeights.bold,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingLabel: {
    fontSize: fonts.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  signOutText: {
    fontSize: fonts.md,
    color: colors.error,
    fontWeight: fontWeights.semibold,
  },
  versionText: {
    textAlign: 'center',
    fontSize: fonts.xs,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
});
