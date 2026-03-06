import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS } from '../../components/animations';

type Step = 'email' | 'code' | 'newPassword';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendCode = async () => {
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setStep('code');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    setStep('newPassword');
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email, code, newPassword);
      Alert.alert('Success', 'Password reset successfully! You can now log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (step === 'code') setStep('email');
          else if (step === 'newPassword') setStep('code');
          else navigation.goBack();
        }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={step === 'newPassword' ? 'lock-closed-outline' : 'key-outline'}
              size={40}
              color={COLORS.primary}
            />
          </View>
        </View>

        {step === 'email' && (
          <>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset code</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'code' && (
          <>
            <Text style={styles.title}>Enter Code</Text>
            <Text style={styles.subtitle}>Check your email for a 6-digit code</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor={COLORS.textTertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyCode}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={handleSendCode}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'newPassword' && (
          <>
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>Create a strong password for your account</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={COLORS.textTertiary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 24 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  input: { flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 16 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', padding: 12, marginTop: 12 },
  resendText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
});
