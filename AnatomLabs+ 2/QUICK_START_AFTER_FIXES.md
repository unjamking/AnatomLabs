# 🚀 Quick Start Guide - After Critical Fixes

All critical frontend errors have been fixed! Follow these simple steps to run the app.

---

## ⚡ 2-Minute Setup

### Step 1: Start Backend (Terminal 1)
```bash
cd "/Users/aleks/LALAOALEKS/AnatomLabs+ 2/backend"
npm run dev
```

✅ You should see: `Server running on port 3001`

### Step 2: Start Mobile App (Terminal 2)
```bash
cd "/Users/aleks/LALAOALEKS/AnatomLabs+ 2/mobile"
npm start
```

✅ Metro bundler starts, QR code appears

### Step 3: Open iOS Simulator
Press **'i'** in the terminal where Metro is running

✅ iOS Simulator opens with the app

### Step 4: Login
- App shows LoginScreen
- Click **"Use Demo Account"** button
- Click **"Login"** button

✅ You're now in the main app!

---

## 🎮 What to Test

### 1. Home Tab 🏠
- Shows user profile
- Displays BMR and TDEE
- Quick action buttons work

### 2. Anatomy Tab 🧬
- Toggle between "3D View" and "List View"
- 3D view shows human body model (or error message if not supported)
- List view shows all body parts
- Click on items to see educational details

### 3. Nutrition Tab 🥗
- Automatically calculates nutrition plan
- Shows BMR, TDEE, Target calories
- Displays macro breakdown (protein, carbs, fat)
- Toggle "Show Scientific Formulas" to see calculations

### 4. Workouts Tab 💪
- Click "+ Generate New" button
- Select goal (muscle gain, fat loss, etc.)
- Choose experience level
- Pick training frequency (2-6 days/week)
- Click "Generate Plan"
- View generated workout plan with exercises

### 5. Reports Tab 📊
- Toggle between "Daily" and "Injury Risk" tabs
- View nutrition adherence
- Check activity metrics
- Monitor injury prevention data

---

## ✅ What's Been Fixed

| Issue | Before | After |
|-------|--------|-------|
| **Navigation** | Stuck on test screen | ✅ Full auth flow working |
| **API Calls** | 404 errors | ✅ Loads data from backend |
| **3D Rendering** | Crashes app | ✅ Safe with error boundaries |
| **Assets** | Build warnings | ✅ All assets present |
| **Types** | Boolean() warnings | ✅ Proper type handling |

---

## 🐛 If Something Goes Wrong

### Backend Not Connecting?
```bash
# Check if backend is running
curl http://localhost:3001/api/body-parts

# Should return JSON data
```

### App Won't Build?
```bash
cd mobile
rm -rf node_modules
npm install
npx expo start -c  # Clear cache
```

### TypeScript Errors?
```bash
cd mobile
npx tsc --noEmit  # Should show no errors
```

### Metro Bundler Issues?
```bash
# Kill any Metro processes
pkill -f "node.*react-native"

# Restart with clean cache
npx expo start -c
```

---

## 📱 Demo Credentials

**Email**: `demo@anatomlabs.com`
**Password**: `password123`

Or click **"Use Demo Account"** button to auto-fill.

---

## 🎯 Expected Behavior

### ✅ Should Work:
- Login and authentication
- Tab navigation
- Loading body parts from backend
- Calculating nutrition plan
- Generating workout plans
- Viewing reports
- Error handling (3D rendering)

### ⚠️ Known Limitations:
- Assets are 1x1 pixel placeholders (visual only, doesn't affect function)
- Auth not persisted (must login each time - intentional for testing)
- Limited seed data (backend has only 10 body parts, 6 exercises)
- 3D rendering basic (optimized for iOS compatibility)

---

## 🔥 Pro Tips

1. **Use List View for Body Explorer** - More reliable than 3D view during testing
2. **Check Backend Logs** - Terminal 1 shows all API requests
3. **Clear Metro Cache** - If you see stale code: `npx expo start -c`
4. **Check Network** - Make sure backend is on port 3001

---

## 📊 Testing Checklist

Run through this to verify everything works:

- [ ] Backend starts without errors
- [ ] Mobile app builds successfully
- [ ] Login screen appears
- [ ] Can login with demo account
- [ ] Navigates to Home tab
- [ ] Home shows user profile
- [ ] Anatomy tab loads body parts
- [ ] Nutrition tab calculates BMR/TDEE
- [ ] Workouts tab can generate plans
- [ ] Reports tab shows data
- [ ] No console errors
- [ ] Tab navigation smooth

---

## 🏆 You're Ready!

If all steps above work, congratulations! The app is fully functional.

### What's Next?
- Add more seed data to backend (`npm run seed`)
- Replace placeholder assets with real icons
- Test on physical iOS device
- Implement additional features (food logging, workout tracking)
- Prepare for competition demo

---

## 📞 Need Help?

**Check these files for detailed info**:
- `CRITICAL_FIXES_SUMMARY.md` - Overview of all fixes
- `mobile/FIXES_APPLIED.md` - Technical details
- `mobile/assets/README.md` - Asset creation guide

**Common Commands**:
```bash
# TypeScript check
cd mobile && npx tsc --noEmit

# Clean rebuild
cd mobile && rm -rf node_modules && npm install

# Backend seed data
cd backend && npm run seed

# View database
cd backend && npx prisma studio
```

---

**Last Updated**: January 29, 2026
**Status**: ✅ All Systems Go!
**Ready For**: iOS Testing & Demo
