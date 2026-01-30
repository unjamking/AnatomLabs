# 📱 iOS Simulator Testing Guide

## ✅ Pre-Flight Checks Complete

All diagnostics passed:
- ✅ All source files present
- ✅ All assets present (placeholders)
- ✅ Dependencies installed
- ✅ Code structure valid
- ✅ No TypeScript errors
- ✅ No obvious rendering issues

## 🚀 Launch Instructions

### Step 1: Start Expo Development Server

```bash
cd "/Users/aleks/LALAOALEKS/AnatomLabs+ 2/mobile"
npx expo start --clear
```

### Step 2: Open iOS Simulator

Once Metro bundler is running, press **`i`** in the terminal.

This will:
1. Launch iOS Simulator (if not already running)
2. Build and install the app
3. Start the app on the simulator

### Step 3: Watch for Errors

**In the terminal**, look for:
- ✅ "Metro waiting on exp://..." - Good!
- ❌ Red text errors - Problem!
- ⚠️  Yellow warnings - Usually OK, but note them

**In iOS Simulator**, look for:
- ✅ Login screen appears - Success!
- ❌ Red error screen - Rendering error
- ❌ White blank screen - Crash or loading issue
- ⚠️  Yellow box warnings - Minor issues

## 🔍 Common Issues & Solutions

### Issue 1: Blank White Screen

**Cause**: App is stuck loading or crashed silently

**Solutions**:
```bash
# Clear cache and restart
npx expo start --clear

# Reset iOS Simulator
xcrun simctl erase all
```

### Issue 2: Red Error Screen

**Common errors and fixes**:

**"undefined is not an object (evaluating 'x.y')"**
- Usually null/undefined data
- Check AuthContext or API calls

**"Invariant Violation"**
- React/React Native version mismatch
- Check package.json versions

**"Unable to resolve module"**
- Missing dependency
- Run: `npm install`

### Issue 3: Metro Bundler Errors

**"Cannot find module"**
```bash
rm -rf node_modules
npm install
```

**"Port 8081 already in use"**
```bash
lsof -ti:8081 | xargs kill -9
```

### Issue 4: 3D Rendering Issues

**Error**: "GL ERROR :GL_INVALID_OPERATION"
- **Expected on iOS Simulator** - Limited OpenGL support
- **Solution**: Use List View instead of 3D View in Body Explorer tab
- This is why we added Error Boundaries - they'll show fallback UI

## 📋 Testing Checklist

Once app launches, test each feature:

### ✅ Authentication Flow
- [ ] Login screen appears
- [ ] "Use Demo Account" button works
- [ ] Login button functions
- [ ] Navigates to Home after login

### ✅ Navigation
- [ ] Bottom tab bar visible with 5 tabs
- [ ] Can switch between tabs
- [ ] No crashes when switching

### ✅ Home Tab
- [ ] Shows "Welcome back" message
- [ ] Displays user stats (BMR, TDEE)
- [ ] Quick action buttons appear

### ✅ Anatomy Tab (Body Explorer)
- [ ] Toggle between 3D and List views
- [ ] **3D View**: Either renders OR shows error boundary fallback (both OK!)
- [ ] **List View**: Shows list of body parts
- [ ] Can click items to see details modal

### ✅ Nutrition Tab
- [ ] Calculates and displays nutrition plan
- [ ] Shows BMR, TDEE, Target calories
- [ ] Displays macro breakdown
- [ ] "Show Scientific Formulas" toggle works

### ✅ Workouts Tab
- [ ] Shows empty state or existing workouts
- [ ] "+ Generate New" button opens modal
- [ ] Can select goal, level, frequency
- [ ] Modal has proper styling

### ✅ Reports Tab
- [ ] Toggles between Daily and Injury Risk
- [ ] Shows data or "No data available"

## 🐛 Known Expected Behaviors

### Expected Warnings (OK to ignore):
- `Require cycle` warnings - Common in React Native, won't affect function
- `VirtualizedLists` warnings - Performance hints, not critical
- `Animated` warnings - iOS Simulator specific, works fine on device

### Expected Limitations:
- **3D rendering may fail on simulator** - This is NORMAL
  - Error boundaries will catch this
  - Fallback message will appear
  - Users can use List View instead
- **API calls will fail if backend not running** - Expected without backend
  - Will show loading states or error messages
  - Focus on UI/UX testing

## 📝 Reporting Issues

If you encounter rendering issues, capture:

1. **Screenshot of error** (if red screen appears)
2. **Metro bundler output** (terminal logs)
3. **Console logs** in simulator (⌘ + / to open)
4. **Specific steps to reproduce**

### Quick Debug Commands

```bash
# View Metro logs
npx expo start --clear

# View iOS Simulator logs
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "Expo"'

# Reset everything
rm -rf node_modules
npm install
npx expo start --clear
xcrun simctl erase all
```

## 🎯 Expected Test Results

**Without Backend**:
- ✅ App launches
- ✅ UI renders correctly
- ✅ Navigation works
- ⚠️  API calls fail gracefully (expected)
- ⚠️  3D rendering may fail (expected on simulator)

**With Backend** (when available):
- ✅ All of the above
- ✅ API calls succeed
- ✅ Data loads from backend
- ✅ Full functionality

## 🚀 Ready to Test!

Run these commands now:

```bash
# Terminal 1: Start the mobile app
cd "/Users/aleks/LALAOALEKS/AnatomLabs+ 2/mobile"
npx expo start --clear

# Wait for Metro bundler, then press 'i' for iOS
```

**What to expect**:
1. Metro bundler starts (10-30 seconds)
2. iOS Simulator launches (if not running)
3. App builds and installs (30-60 seconds first time)
4. Login screen appears 🎉

---

**Status**: ✅ Code is ready for testing
**Date**: January 29, 2026
