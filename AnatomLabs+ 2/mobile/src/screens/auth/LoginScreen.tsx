import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  AnimatedButton,
  FadeIn,
  SlideIn,
  ScaleIn,
  useHaptics,
  COLORS,
  SPRING_CONFIG,
} from '../../components/animations';

interface Props {
  navigation: any;
}

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trigger } = useHaptics();

  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    logoScale.value = withDelay(100, withSpring(1, SPRING_CONFIG.bouncy));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const handleLogin = async () => {
    if (!email || !password) {
      trigger('warning');
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    trigger('medium');
    try {
      await login({ email, password });
      trigger('success');
    } catch (error: any) {
      trigger('error');
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const useDemoAccount = () => {
    trigger('light');
    setEmail('demo@anatomlabs.com');
    setPassword('password123');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.header, logoStyle]}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#e74c3c', '#c0392b']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="fitness" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>AnatomLabs+</Text>
          <Text style={styles.subtitle}>Human Performance Science</Text>
        </Animated.View>

        <View style={styles.form}>
          <SlideIn direction="left" delay={200}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>
          </SlideIn>

          <SlideIn direction="left" delay={300}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                editable={!isLoading}
              />
            </View>
          </SlideIn>

          <SlideIn direction="bottom" delay={400}>
            <AnimatedButton
              title={isLoading ? undefined : "Login"}
              variant="primary"
              size="large"
              onPress={handleLogin}
              disabled={isLoading}
              style={styles.loginButton}
              hapticType="medium"
            >
              {isLoading && <ActivityIndicator color="#fff" />}
            </AnimatedButton>
          </SlideIn>

          <FadeIn delay={500}>
            <AnimatedButton
              title="Use Demo Account"
              variant="ghost"
              size="medium"
              onPress={useDemoAccount}
              disabled={isLoading}
              style={styles.demoButton}
              hapticType="light"
            />
          </FadeIn>
        </View>

        <FadeIn delay={600}>
          <AnimatedButton
            variant="ghost"
            size="medium"
            onPress={() => {
              trigger('light');
              navigation.navigate('Register');
            }}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.registerLinkBold}>Sign Up</Text>
            </Text>
          </AnimatedButton>
        </FadeIn>

        <FadeIn delay={700}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Educational Platform</Text>
            <Text style={styles.footerSubtext}>
              Science & Technology Competition Project
            </Text>
          </View>
        </FadeIn>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  loginButton: {
    marginTop: 10,
  },
  demoButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    marginBottom: 4,
  },
  footerSubtext: {
    color: '#444',
    fontSize: 12,
  },
  registerLink: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  registerLinkText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerLinkBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
