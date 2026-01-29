// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number; // kg
  height: number; // cm
  goal: 'muscle_gain' | 'fat_loss' | 'maintenance' | 'endurance' | 'strength';
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  goal: string;
  experience_level: string;
  activity_level: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Body Parts & Anatomy Types
export interface BodyPart {
  id: string;
  name: string;
  type: 'muscle' | 'organ' | 'bone';
  layer: number; // 1=surface, 2=middle, 3=deep
  position_x: number;
  position_y: number;
  position_z: number;
  educational_info: EducationalInfo;
  muscles?: Muscle[];
}

export interface Muscle {
  id: string;
  name: string;
  bodyPartId: string;
  scientificName: string;
  function: string;
  recoveryTime: number; // hours
  exercises?: Exercise[];
}

export interface EducationalInfo {
  whatItIs: string;
  whatItDoes: string;
  whyItMatters: string;
  howItWorks: string;
}

// Exercise Types
export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  biomechanics: string;
  commonMistakes: string[];
  safetyTips: string[];
  activationRating: number; // 0-100
}

export interface ExerciseInWorkout extends Exercise {
  sets: number;
  reps: string;
  rest: number; // seconds
  notes?: string;
}

// Workout Types
export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  goal: string;
  experienceLevel: string;
  frequency: number; // days per week
  split: string;
  workouts: WorkoutDay[];
  createdAt: string;
}

export interface WorkoutDay {
  day: number;
  name: string;
  focus: string[];
  exercises: ExerciseInWorkout[];
  totalVolume: number; // sets
  estimatedDuration: number; // minutes
}

export interface GenerateWorkoutRequest {
  goal: 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'sport_specific';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  frequency: number; // 2-6 days per week
  availableEquipment: string[];
  sport?: string; // for sport-specific
  injuries?: string[];
}

// Nutrition Types
export interface NutritionPlan {
  id?: string;
  userId?: string;
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: MacroTargets;
  goal?: string;
  activityLevel?: string;
  calculation?: NutritionCalculation;
  explanation?: NutritionExplanation;
  createdAt?: string;
}

export interface NutritionExplanation {
  bmrFormula: string;
  tdeeCalculation: string;
  calorieAdjustment: string;
  macroRationale: string;
}

export interface MacroTargets {
  protein: number; // grams
  carbs: number;
  fat: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
}

export interface NutritionCalculation {
  bmrFormula: string;
  tdeeFormula: string;
  proteinFormula: string;
  fatFormula: string;
  carbsFormula: string;
}

export interface Food {
  id: string;
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodLog {
  id: string;
  userId: string;
  foodId: string;
  food: Food;
  servings: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
}

// Nutrition Tracking Types
export interface DailyNutritionSummary {
  date: string;
  meals: {
    breakfast: FoodLog[];
    lunch: FoodLog[];
    dinner: FoodLog[];
    snack: FoodLog[];
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  logCount: number;
}

export interface WeightLog {
  id: string;
  userId: string;
  weight: number;
  date: string;
  note?: string;
}

export interface WeightTrend {
  current: number | null;
  average7Day: number | null;
  average30Day: number | null;
  trend: 'up' | 'down' | 'stable' | 'insufficient_data';
  change: number | null;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  lastLoggedDate: string | null;
}

export interface StreakUpdate extends UserStreak {
  badge?: string;
}

export interface FoodSuggestion {
  id: string;
  name: string;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  score: number;
  reason: string;
}

export interface SuggestionsResponse {
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  suggestions: FoodSuggestion[];
}

export interface RecentFoodsResponse {
  recent: (Food & { lastLogged: string; defaultServings: number })[];
  frequent: (Food & { logCount: number })[];
}

export interface MealPresetItem {
  id: string;
  mealPresetId: string;
  foodId: string;
  servings: number;
  food: Food;
}

export interface MealPreset {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  items: MealPresetItem[];
}

// Activity & Tracking Types
export interface ActivityLog {
  id: string;
  userId: string;
  date: string;
  steps: number;
  caloriesBurned: number;
  waterIntake: number; // ml
  sleepHours: number;
}

// Injury Prevention Types
export interface InjuryRisk {
  muscle: Muscle;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  usageCount: number;
  lastTrained: string;
  hoursSinceTraining: number;
  recommendations: string[];
}

export interface InjuryReport {
  overallRisk: 'low' | 'moderate' | 'high' | 'very_high';
  musclesAtRisk: InjuryRisk[];
  recommendations: string[];
  needsRestDay: boolean;
}

// Reports Types
export interface DailyReport {
  date: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    adherence: number; // 0-100%
  };
  activity: {
    steps: number;
    caloriesBurned: number;
    waterIntake: number;
    sleepHours: number;
  };
  training: {
    workoutsCompleted: number;
    totalVolume: number; // sets
    musclesTrained: string[];
  };
  injuryRisk: InjuryReport;
}

export interface WeeklyReport extends DailyReport {
  weekStart: string;
  weekEnd: string;
  averageAdherence: number;
  totalWorkouts: number;
  progressIndicators: {
    weightChange?: number;
    strengthGains?: number;
    volumeIncrease?: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}
