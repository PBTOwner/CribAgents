import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>CA</Text>
            </View>
            <Text style={styles.brand}>CribAgents</Text>
            <Text style={styles.tagline}>West Palm Beach's AI-Powered Realtor</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome Back</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.linkText}>
                Don't have an account?{' '}
                <Text style={styles.linkAccent}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Rasha Rahaman | Licensed FL Realtor | CribAgents © 2026
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  logoArea: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  logoBox: {
    width: 72, height: 72, borderRadius: Radius.lg,
    backgroundColor: Colors.gold, justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  brand: { fontSize: 28, fontWeight: '800', color: Colors.textInverse, letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  form: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  formTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.lg },
  fieldGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: 15, color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: 14, color: Colors.textSecondary },
  linkAccent: { color: Colors.primary, fontWeight: '600' },
  footer: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  footerText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});
