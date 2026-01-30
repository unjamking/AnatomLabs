import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { NutritionProvider } from './src/context/NutritionContext';
import { WorkoutTrackingProvider } from './src/context/WorkoutTrackingContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NutritionProvider>
            <WorkoutTrackingProvider>
              <AppNavigator />
            </WorkoutTrackingProvider>
          </NutritionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
