#!/bin/bash

# Script to fix the circular dependency between AnatomLabs and ReactCodegen
# This script should be run from your project root directory

set -e

echo "🔧 Fixing React Native/Expo circular dependency issue..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to iOS directory
if [ -d "ios" ]; then
    cd ios
    echo "✅ Found ios directory"
else
    echo "${RED}❌ Error: ios directory not found. Please run this from your project root.${NC}"
    exit 1
fi

# Step 1: Close Xcode (if running)
echo ""
echo "${YELLOW}📱 Step 1: Checking for running Xcode processes...${NC}"
if pgrep -x "Xcode" > /dev/null; then
    echo "⚠️  Xcode is running. Please close Xcode manually and press Enter to continue..."
    read -r
else
    echo "✅ Xcode is not running"
fi

# Step 2: Clean build artifacts
echo ""
echo "${YELLOW}🧹 Step 2: Cleaning build artifacts...${NC}"
if [ -d "build" ]; then
    rm -rf build
    echo "✅ Removed build directory"
else
    echo "ℹ️  No build directory found"
fi

# Step 3: Remove Pods
echo ""
echo "${YELLOW}🗑️  Step 3: Removing Pods...${NC}"
if [ -d "Pods" ]; then
    rm -rf Pods
    echo "✅ Removed Pods directory"
else
    echo "ℹ️  No Pods directory found"
fi

# Step 4: Remove Podfile.lock
echo ""
echo "${YELLOW}🔓 Step 4: Removing Podfile.lock...${NC}"
if [ -f "Podfile.lock" ]; then
    rm -f Podfile.lock
    echo "✅ Removed Podfile.lock"
else
    echo "ℹ️  No Podfile.lock found"
fi

# Step 5: Clean DerivedData
echo ""
echo "${YELLOW}🧼 Step 5: Cleaning DerivedData...${NC}"
if [ -d "$HOME/Library/Developer/Xcode/DerivedData" ]; then
    rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/*
    echo "✅ Cleaned DerivedData"
else
    echo "ℹ️  DerivedData directory not found"
fi

# Step 6: Deintegrate CocoaPods
echo ""
echo "${YELLOW}🔌 Step 6: Deintegrating CocoaPods...${NC}"
if command -v pod &> /dev/null; then
    pod deintegrate || echo "⚠️  Deintegration warning (this is usually okay)"
    echo "✅ Deintegrated CocoaPods"
else
    echo "${RED}❌ CocoaPods not found. Please install it: sudo gem install cocoapods${NC}"
    exit 1
fi

# Step 7: Update CocoaPods repo (optional but recommended)
echo ""
echo "${YELLOW}📦 Step 7: Updating CocoaPods repository...${NC}"
echo "This may take a few minutes..."
pod repo update || echo "⚠️  Repo update warning (continuing anyway)"

# Step 8: Reinstall Pods
echo ""
echo "${YELLOW}⬇️  Step 8: Installing Pods...${NC}"
echo "This may take several minutes..."
pod install --verbose

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ SUCCESS! Pods installed successfully.${NC}"
else
    echo ""
    echo "${RED}❌ Pod installation failed. Please check the error messages above.${NC}"
    exit 1
fi

# Step 9: Final cleanup
echo ""
echo "${YELLOW}🧹 Step 9: Final cleanup...${NC}"
cd ..

# Clean node_modules cache (optional but can help)
if [ -d "node_modules" ]; then
    echo "Found node_modules. Cleaning React Native cache..."
    npx react-native clean || echo "⚠️  React Native clean not available"
fi

# Step 10: Instructions
echo ""
echo "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo "${GREEN}✨ Dependency cycle fix completed!${NC}"
echo "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Open your .xcworkspace file (NOT .xcodeproj):"
echo "   ${YELLOW}open ios/AnatomLabs.xcworkspace${NC}"
echo ""
echo "2. In Xcode, clean the build folder:"
echo "   ${YELLOW}Product > Clean Build Folder (⇧⌘K)${NC}"
echo ""
echo "3. Build your project:"
echo "   ${YELLOW}Product > Build (⌘B)${NC}"
echo ""
echo "If the issue persists, you may need to:"
echo "- Update your Expo SDK: ${YELLOW}npx expo install --fix${NC}"
echo "- Check for React Native version conflicts"
echo ""
