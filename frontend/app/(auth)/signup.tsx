import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant', label: 'Tenant' },
];

export default function SignupScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in your name, email, and password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined, password, role });
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.brand}>CribAgents</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSub}>Join West Palm Beach's smartest real estate platform</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                placeholder="Jane Smith" placeholderTextColor={Colors.textLight} autoCapitalize="words" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="jane@example.com" placeholderTextColor={Colors.textLight}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="(561) 555-0100" placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                placeholder="Min. 8 characters" placeholderTextColor={Colors.textLight}
                secureTextEntry autoCapitalize="none" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>I Am A...</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleChip, role === r.value && styles.roleChipActive]}
                    onPress={() => setRole(r.value)}
                  >
                    <Text style={[styles.roleChipText, role === r.value && styles.roleChipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} onPress={() => router.back()}>
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkAccent}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg, paddingTop: Spacing.sm },
  backBtn: { padding: Spacing.xs },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  brand: { fontSize: 20, fontWeight: '800', color: Colors.textInverse },
  form: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  formTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.xs },
  formSub: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.lg },
  fieldGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 15, color: Colors.text },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  roleChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.inputBg },
  roleChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  roleChipTextActive: { color: Colors.textInverse },
  button: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: 14, color: Colors.textSecondary },
  linkAccent: { color: Colors.primary, fontWeight: '600' },
});
