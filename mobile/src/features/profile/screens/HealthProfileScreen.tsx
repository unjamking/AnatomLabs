import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideOutDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../../features/auth/AuthContext';
import api from '../../../services/api';
import MultiSelectChips, { CollapsibleSection } from '../../../shared/components/forms/MultiSelectChips';
import { COLORS, useHaptics } from '../../../shared/components/animations';

type SectionKey = 'account' | 'personal' | 'avatar' | 'physical' | 'health' | 'allergies' | 'dietary' | 'password' | null;

interface HealthOptions {
  physicalLimitations: { id: string; name: string; description: string }[];
  medicalConditions: { id: string; name: string; description: string }[];
  foodAllergies: { id: string; name: string; description: string; severity: string }[];
  dietaryPreferences: { id: string; name: string; description: string }[];
}

interface HealthProfile {
  physicalLimitations: string[];
  healthConditions: string[];
  foodAllergies: string[];
  dietaryPreferences: string[];
  avatar?: string;
}

export default function HealthProfileScreen({ navigation }: any) {
  const { user, updateUser, logout, refreshUser } = useAuth();
  const { trigger } = useHaptics();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [healthOptions, setHealthOptions] = useState<HealthOptions | null>(null);

  const [physicalLimitations, setPhysicalLimitations] = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);

  const [editName, setEditName] = useState(user?.name || '');
  const [editAge, setEditAge] = useState(user?.age?.toString() || '');
  const [editWeight, setEditWeight] = useState(user?.weight?.toString() || '');
  const [editHeight, setEditHeight] = useState(user?.height?.toString() || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [originalProfile, setOriginalProfile] = useState<HealthProfile | null>(null);

  const [expandedSection, setExpandedSection] = useState<SectionKey>('account');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const handleSectionToggle = (section: SectionKey) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (originalProfile) {
      const changed =
        JSON.stringify(physicalLimitations.sort()) !== JSON.stringify(originalProfile.physicalLimitations.sort()) ||
        JSON.stringify(healthConditions.sort()) !== JSON.stringify(originalProfile.healthConditions.sort()) ||
        JSON.stringify(foodAllergies.sort()) !== JSON.stringify(originalProfile.foodAllergies.sort()) ||
        JSON.stringify(dietaryPreferences.sort()) !== JSON.stringify(originalProfile.dietaryPreferences.sort()) ||
        avatar !== originalProfile.avatar ||
        editName !== (user?.name || '') ||
        editAge !== (user?.age?.toString() || '') ||
        editWeight !== (user?.weight?.toString() || '') ||
        editHeight !== (user?.height?.toString() || '');
      setHasChanges(changed);
    }
  }, [physicalLimitations, healthConditions, foodAllergies, dietaryPreferences, avatar, originalProfile, editName, editAge, editWeight, editHeight]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [options, profile] = await Promise.all([
        api.getHealthConditions(),
        api.getUserProfile(),
      ]);

      setHealthOptions(options);

      const currentProfile: HealthProfile = {
        physicalLimitations: profile.physicalLimitations || [],
        healthConditions: profile.healthConditions || [],
        foodAllergies: profile.foodAllergies || [],
        dietaryPreferences: profile.dietaryPreferences || [],
        avatar: user?.avatar || undefined,
      };

      setPhysicalLimitations(currentProfile.physicalLimitations);
      setHealthConditions(currentProfile.healthConditions);
      setFoodAllergies(currentProfile.foodAllergies);
      setDietaryPreferences(currentProfile.dietaryPreferences);
      setAvatar(user?.avatar || null);
      setEditName(user?.name || '');
      setEditAge(user?.age?.toString() || '');
      setEditWeight(user?.weight?.toString() || '');
      setEditHeight(user?.height?.toString() || '');
      setOriginalProfile(currentProfile);
    } catch (error) {
      console.error('Error loading health profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = async () => {
    trigger('medium');
    if (!cameraPermission?.granted) {
      const r = await requestCameraPermission();
      if (!r.granted) { Alert.alert('Camera access needed', 'Allow camera in Settings.'); return; }
    }
    setCameraVisible(true);
  };

  const pickFromRoll = async () => {
    trigger('light');
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });
    if (!r.canceled && r.assets?.length > 0) {
      setAvatar(r.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    trigger('medium');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      setAvatar(photo.uri);
      setCameraVisible(false);
    } catch (e) {
      console.error('Take photo error:', e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    await loadData();
    setIsRefreshing(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      let finalAvatar = avatar;

      if (avatar && (avatar.startsWith('file://') || avatar.startsWith('content://'))) {
        const { avatarUrl } = await api.uploadAvatar(avatar);
        finalAvatar = avatarUrl;
      }

      const profileUpdate: any = {};
      if (editName !== (user?.name || '')) profileUpdate.name = editName;
      if (editAge !== (user?.age?.toString() || '')) profileUpdate.age = editAge ? parseInt(editAge) : null;
      if (editWeight !== (user?.weight?.toString() || '')) profileUpdate.weight = editWeight ? parseFloat(editWeight) : null;
      if (editHeight !== (user?.height?.toString() || '')) profileUpdate.height = editHeight ? parseFloat(editHeight) : null;

      if (Object.keys(profileUpdate).length > 0) {
        await api.updateUserProfile(user!.id, profileUpdate);
      }

      await api.updateHealthProfile({
        physicalLimitations,
        healthConditions,
        foodAllergies,
        dietaryPreferences,
      });

      updateUser({
        ...profileUpdate,
        avatar: finalAvatar || undefined,
        physicalLimitations,
        healthConditions,
        foodAllergies,
        dietaryPreferences,
        healthProfileComplete: true
      });

      setOriginalProfile({
        physicalLimitations,
        healthConditions,
        foodAllergies,
        dietaryPreferences,
        avatar: finalAvatar || undefined,
      });

      setHasChanges(false);
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleReset = () => {
    if (!originalProfile) return;
    Alert.alert('Reset Changes?', 'This will discard all unsaved changes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          setPhysicalLimitations(originalProfile.physicalLimitations);
          setHealthConditions(originalProfile.healthConditions);
          setFoodAllergies(originalProfile.foodAllergies);
          setDietaryPreferences(originalProfile.dietaryPreferences);
          setAvatar(originalProfile.avatar || null);
          setEditName(user?.name || '');
          setEditAge(user?.age?.toString() || '');
          setEditWeight(user?.weight?.toString() || '');
          setEditHeight(user?.height?.toString() || '');
        },
      },
    ]);
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
        </View>
        <View style={styles.headerActions}>
          {hasChanges && (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={() => handleSectionToggle('avatar')}>
            <View style={[styles.avatarRing, { borderColor: user?.isCoach ? COLORS.primary : '#3498db' }]}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={[user?.isCoach ? COLORS.primary : '#3498db', '#1a1a1a']} style={styles.avatarGrad}>
                  <Text style={styles.avatarText}>{initials(user?.name || '')}</Text>
                </LinearGradient>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.badges}>
            {user?.isCoach && (
              <View style={[styles.badge, { backgroundColor: `${COLORS.primary}20` }]}>
                <Text style={[styles.badgeText, { color: COLORS.primary }]}>Coach</Text>
              </View>
            )}
            {(user as any)?.emailVerified ? (
              <View style={[styles.badge, { backgroundColor: '#2ecc7120' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#2ecc71" />
                <Text style={[styles.badgeText, { color: '#2ecc71' }]}>Verified</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.badge, { backgroundColor: '#f39c1220' }]}
                onPress={() => navigation.navigate('VerifyEmail')}
              >
                <Ionicons name="warning" size={12} color="#f39c12" />
                <Text style={[styles.badgeText, { color: '#f39c12' }]}>Verify Email</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.weight ? `${user.weight}kg` : '--'}</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.height ? `${user.height}cm` : '--'}</Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.age || '--'}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.goal?.replace(/_/g, ' ') || '--'}</Text>
              <Text style={styles.statLabel}>Goal</Text>
            </View>
          </View>
        </View>

        {/* Avatar Section */}
        <CollapsibleSection
          title="Profile Photo"
          isExpanded={expandedSection === 'avatar'}
          onToggle={() => handleSectionToggle('avatar')}
          accentColor={COLORS.primary}
        >
          <View style={styles.avatarBtns}>
            <TouchableOpacity style={styles.avatarBtn} onPress={openCamera}>
              <LinearGradient colors={[COLORS.cardBackground, '#111']} style={styles.avatarBtnGrad}>
                <Ionicons name="camera" size={20} color={COLORS.text} />
                <Text style={styles.avatarBtnText}>Take Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={pickFromRoll}>
              <LinearGradient colors={[COLORS.cardBackground, '#111']} style={styles.avatarBtnGrad}>
                <Ionicons name="images" size={20} color={COLORS.text} />
                <Text style={styles.avatarBtnText}>Choose Library</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CollapsibleSection>

        {/* Personal Info Section */}
        <CollapsibleSection
          title="Personal Information"
          isExpanded={expandedSection === 'personal'}
          onToggle={() => handleSectionToggle('personal')}
          accentColor="#3498db"
        >
          <View style={styles.formFields}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={COLORS.textTertiary}
                placeholder="Your name"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.fieldInput}
                value={editAge}
                onChangeText={setEditAge}
                placeholderTextColor={COLORS.textTertiary}
                placeholder="Age"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={editWeight}
                onChangeText={setEditWeight}
                placeholderTextColor={COLORS.textTertiary}
                placeholder="Weight"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <TextInput
                style={styles.fieldInput}
                value={editHeight}
                onChangeText={setEditHeight}
                placeholderTextColor={COLORS.textTertiary}
                placeholder="Height"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </CollapsibleSection>

        {/* Change Password Section */}
        <CollapsibleSection
          title="Change Password"
          isExpanded={expandedSection === 'password'}
          onToggle={() => handleSectionToggle('password')}
          accentColor="#f39c12"
        >
          <View style={styles.formFields}>
            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPasswords}
              />
            </View>
            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPasswords}
              />
            </View>
            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPasswords}
              />
            </View>
            <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)} style={styles.showPassBtn}>
              <Ionicons name={showPasswords ? 'eye-off' : 'eye'} size={18} color={COLORS.textSecondary} />
              <Text style={styles.showPassText}>{showPasswords ? 'Hide' : 'Show'} passwords</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.changePassBtn, changingPassword && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.changePassBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </CollapsibleSection>

        {healthOptions && (
          <>
            <CollapsibleSection
              title="Physical Limitations"
              isExpanded={expandedSection === 'physical'}
              onToggle={() => handleSectionToggle('physical')}
              badge={physicalLimitations.length > 0 ? `${physicalLimitations.length}` : undefined}
              accentColor="#e74c3c"
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionInfoText}>
                  Select any injuries or mobility limitations. We'll avoid exercises that could aggravate these conditions.
                </Text>
              </View>
              <MultiSelectChips
                title=""
                options={healthOptions.physicalLimitations}
                selectedIds={physicalLimitations}
                onSelectionChange={setPhysicalLimitations}
                collapsible={false}
                accentColor="#e74c3c"
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Health Conditions"
              isExpanded={expandedSection === 'health'}
              onToggle={() => handleSectionToggle('health')}
              badge={healthConditions.length > 0 ? `${healthConditions.length}` : undefined}
              accentColor="#9b59b6"
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionInfoText}>
                  Medical conditions affect both exercise intensity recommendations and nutrition targets.
                </Text>
              </View>
              <MultiSelectChips
                title=""
                options={healthOptions.medicalConditions}
                selectedIds={healthConditions}
                onSelectionChange={setHealthConditions}
                collapsible={false}
                accentColor="#9b59b6"
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Food Allergies"
              isExpanded={expandedSection === 'allergies'}
              onToggle={() => handleSectionToggle('allergies')}
              badge={foodAllergies.length > 0 ? `${foodAllergies.length}` : undefined}
              accentColor="#f39c12"
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionInfoText}>
                  We'll warn you about foods containing these allergens when tracking nutrition.
                </Text>
              </View>
              <MultiSelectChips
                title=""
                options={healthOptions.foodAllergies}
                selectedIds={foodAllergies}
                onSelectionChange={setFoodAllergies}
                collapsible={false}
                accentColor="#f39c12"
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Dietary Preferences"
              isExpanded={expandedSection === 'dietary'}
              onToggle={() => handleSectionToggle('dietary')}
              badge={dietaryPreferences.length > 0 ? `${dietaryPreferences.length}` : undefined}
              accentColor="#2ecc71"
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionInfoText}>
                  Your dietary preferences help filter food suggestions and adjust macro recommendations.
                </Text>
              </View>
              <MultiSelectChips
                title=""
                options={healthOptions.dietaryPreferences}
                selectedIds={dietaryPreferences}
                onSelectionChange={setDietaryPreferences}
                collapsible={false}
                accentColor="#2ecc71"
              />
            </CollapsibleSection>
          </>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>AnatomLabs+ v1.0.0</Text>
      </ScrollView>

      {hasChanges && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={SlideOutDown.duration(200)}
          style={styles.saveContainer}
        >
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
            )}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setCameraVisible(false)}>
        <View style={styles.camRoot}>
          <StatusBar barStyle="light-content" />
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />
          <SafeAreaView style={styles.camTop}>
            <TouchableOpacity style={styles.camBtn} onPress={() => setCameraVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.camBtn} onPress={() => setCameraFacing(f => f === 'back' ? 'front' : 'back')}>
              <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.camShutter}>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  headerActions: { flexDirection: 'row' },
  resetButton: { padding: 8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  profileCard: {
    alignItems: 'center', padding: 24, marginBottom: 16,
    backgroundColor: COLORS.cardBackground, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, padding: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarGrad: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  profileName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2, textTransform: 'capitalize' },
  statLabel: { fontSize: 11, color: COLORS.textTertiary },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  avatarBtns: { flexDirection: 'row', gap: 12, width: '100%', paddingVertical: 12 },
  avatarBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  avatarBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  avatarBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  formFields: { gap: 12, paddingVertical: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  fieldLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', width: 100 },
  fieldInput: { flex: 1, textAlign: 'right', fontSize: 15, color: COLORS.text, paddingVertical: 14 },
  passwordField: { backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16 },
  passwordInput: { fontSize: 15, color: COLORS.text, paddingVertical: 14 },
  showPassBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  showPassText: { fontSize: 13, color: COLORS.textSecondary },
  changePassBtn: { backgroundColor: '#f39c12', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  changePassBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionInfo: { marginBottom: 12, paddingHorizontal: 4 },
  sectionInfoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 24, backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(231,76,60,0.2)' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#e74c3c' },
  versionText: { textAlign: 'center', color: COLORS.textTertiary, fontSize: 12, marginTop: 16, marginBottom: 20 },
  saveContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,10,10,0.9)', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveButton: { backgroundColor: '#2ecc71', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  camRoot: { flex: 1, backgroundColor: '#000' },
  camTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  camBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  camShutter: { position: 'absolute', bottom: 60, alignSelf: 'center' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
});
