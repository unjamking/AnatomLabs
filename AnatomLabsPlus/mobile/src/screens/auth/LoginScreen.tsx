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
import { Image } from 'react-native';
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a0a0a', '#111', '#0a0a0a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.header, logoStyle]}>
          <Image
            source={require('../../../assets/splash-icon.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.title}>AnatomLabs<Text style={styles.titlePlus}>+</Text></Text>
          <Text style={styles.subtitle}>Human Performance Science</Text>
        </Animated.View>

        <View style={styles.form}>
          <SlideIn direction="bottom" delay={200}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>
          </SlideIn>

          <SlideIn direction="bottom" delay={300}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
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
              title={isLoading ? undefined : "Sign In"}
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
        </View>

        <FadeIn delay={500}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
        </FadeIn>

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
              Don't have an account? <Text style={styles.registerLinkBold}>Create one</Text>
            </Text>
          </AnimatedButton>
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
    justifyContent: 'flex-start',
    paddingTop: '18%',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImg: {
    width: 210,
    height: 210,
    marginBottom: -10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  titlePlus: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  form: {
    gap: 12,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: COLORS.text,
  },
  loginButton: {
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerLinkText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  registerLinkBold: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
