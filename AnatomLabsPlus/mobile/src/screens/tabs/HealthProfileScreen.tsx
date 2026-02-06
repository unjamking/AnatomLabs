import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MultiSelectChips, { CollapsibleSection } from '../../components/forms/MultiSelectChips';
import { COLORS } from '../../components/animations';

type SectionKey = 'physical' | 'health' | 'allergies' | 'dietary' | null;

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
}

export default function HealthProfileScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Health options from API
  const [healthOptions, setHealthOptions] = useState<HealthOptions | null>(null);

  // User's current selections
  const [physicalLimitations, setPhysicalLimitations] = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);

  // Original values for comparison
  const [originalProfile, setOriginalProfile] = useState<HealthProfile | null>(null);

  // Accordion state - only one section open at a time
  const [expandedSection, setExpandedSection] = useState<SectionKey>(null);

  const handleSectionToggle = (section: SectionKey) => {
    // If clicking the same section, close it. Otherwise, open the new one (and close others)
    setExpandedSection(expandedSection === section ? null : section);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Track changes
  useEffect(() => {
    if (originalProfile) {
      const changed =
        JSON.stringify(physicalLimitations.sort()) !== JSON.stringify(originalProfile.physicalLimitations.sort()) ||
        JSON.stringify(healthConditions.sort()) !== JSON.stringify(originalProfile.healthConditions.sort()) ||
        JSON.stringify(foodAllergies.sort()) !== JSON.stringify(originalProfile.foodAllergies.sort()) ||
        JSON.stringify(dietaryPreferences.sort()) !== JSON.stringify(originalProfile.dietaryPreferences.sort());
      setHasChanges(changed);
    }
  }, [physicalLimitations, healthConditions, foodAllergies, dietaryPreferences, originalProfile]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load health options and user profile in parallel
      const [options, profile] = await Promise.all([
        api.getHealthConditions(),
        api.getUserProfile(),
      ]);

      setHealthOptions(options);

      // Set current user selections
      const currentProfile: HealthProfile = {
        physicalLimitations: profile.physicalLimitations || [],
        healthConditions: profile.healthConditions || [],
        foodAllergies: profile.foodAllergies || [],
        dietaryPreferences: profile.dietaryPreferences || [],
      };

      setPhysicalLimitations(currentProfile.physicalLimitations);
      setHealthConditions(currentProfile.healthConditions);
      setFoodAllergies(currentProfile.foodAllergies);
      setDietaryPreferences(currentProfile.dietaryPreferences);
      setOriginalProfile(currentProfile);
    } catch (error) {
      console.error('Error loading health profile:', error);
      Alert.alert('Error', 'Failed to load health profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await api.updateHealthProfile({
        physicalLimitations,
        healthConditions,
        foodAllergies,
        dietaryPreferences,
      });

      // Update original profile to reflect saved state
      setOriginalProfile({
        physicalLimitations,
        healthConditions,
        foodAllergies,
        dietaryPreferences,
      });

      setHasChanges(false);
      Alert.alert('Success', 'Your health profile has been updated. Your workout and nutrition recommendations will now reflect these changes.');
    } catch (error) {
      console.error('Error saving health profile:', error);
      Alert.alert('Error', 'Failed to save health profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!originalProfile) return;

    Alert.alert(
      'Reset Changes?',
      'This will discard all unsaved changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPhysicalLimitations(originalProfile.physicalLimitations);
            setHealthConditions(originalProfile.healthConditions);
            setFoodAllergies(originalProfile.foodAllergies);
            setDietaryPreferences(originalProfile.dietaryPreferences);
          },
        },
      ]
    );
  };

  const getTotalSelected = () => {
    return physicalLimitations.length + healthConditions.length + foodAllergies.length + dietaryPreferences.length;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading health profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Health Profile</Text>
          {getTotalSelected() > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{getTotalSelected()}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {hasChanges && (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#3498db" />
        <Text style={styles.infoBannerText}>
          Your health profile personalizes workout recommendations and nutrition targets. This information is private and used only to improve your experience.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {healthOptions && (
          <>
            {/* Physical Limitations */}
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

            {/* Health/Medical Conditions */}
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

            {/* Food Allergies */}
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

            {/* Dietary Preferences */}
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

            {/* Summary of what these settings affect */}
            {getTotalSelected() > 0 && (
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                style={styles.summaryCard}
              >
                <Text style={styles.summaryTitle}>How this affects your experience:</Text>

                {physicalLimitations.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="fitness-outline" size={18} color="#e74c3c" />
                    <Text style={styles.summaryText}>
                      Workouts will exclude or modify {physicalLimitations.length} types of exercises
                    </Text>
                  </View>
                )}

                {healthConditions.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="medical-outline" size={18} color="#9b59b6" />
                    <Text style={styles.summaryText}>
                      Nutrition targets adjusted for {healthConditions.length} health condition(s)
                    </Text>
                  </View>
                )}

                {foodAllergies.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="warning-outline" size={18} color="#f39c12" />
                    <Text style={styles.summaryText}>
                      Allergy warnings for {foodAllergies.length} food type(s)
                    </Text>
                  </View>
                )}

                {dietaryPreferences.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="leaf-outline" size={18} color="#2ecc71" />
                    <Text style={styles.summaryText}>
                      Food suggestions filtered by {dietaryPreferences.length} dietary preference(s)
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  resetButton: {
    padding: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionInfo: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
