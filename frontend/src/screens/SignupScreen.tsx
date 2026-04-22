import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { colors, fonts, spacing, borderRadius, fontWeights } from '../utils/theme';
import { useStore } from '../utils/store';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type SignupNav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

const ROLES = ['Buyer', 'Seller', 'Landlord', 'Tenant', 'Agent'] as const;

export default function SignupScreen() {
  const navigation = useNavigation<SignupNav>();
  const signup = useStore((s) => s.signup);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password || !role) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Error', 'Please agree to the Terms & Conditions.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: role.toLowerCase(),
        licenseNumber: role === 'Agent' ? licenseNumber.trim() : undefined,
      });
    } catch (error: any) {
      Alert.alert(
        'Signup Failed',
        error?.response?.data?.message || 'Could not create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join CribAgents and find your perfect home</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <InputField
              icon="person-outline"
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <InputField
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              icon="call-outline"
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <InputField
              icon="lock-closed-outline"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* Role Selector */}
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleContainer}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* License Number (Agent only) */}
            {role === 'Agent' && (
              <InputField
                icon="card-outline"
                placeholder="Real Estate License Number"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            )}

            {/* Terms */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={agreeTerms ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreeTerms ? colors.primary : colors.textLight}
              />
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.createButton, loading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Reusable input ─────────────────────────────────────────────────────────

interface InputFieldProps {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  secureTextEntry?: boolean;
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize = 'none',
  secureTextEntry,
}: InputFieldProps) {
  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color={colors.textLight} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fonts['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fonts.base,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.base,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fonts.md,
    color: colors.text,
  },
  label: {
    fontSize: fonts.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
    marginTop: spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipText: {
    fontSize: fonts.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  roleChipTextActive: {
    color: colors.white,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  termsText: {
    flex: 1,
    fontSize: fonts.sm,
    color: colors.textLight,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.secondary,
    fontWeight: fontWeights.medium,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fonts.lg,
    fontWeight: fontWeights.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fonts.base,
    color: colors.textLight,
  },
  loginLink: {
    fontSize: fonts.base,
    color: colors.secondary,
    fontWeight: fontWeights.semibold,
  },
});
