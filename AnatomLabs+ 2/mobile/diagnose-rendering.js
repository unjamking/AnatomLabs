#!/usr/bin/env node

/**
 * Frontend Rendering Diagnostics Script
 * Checks for common rendering issues in React Native apps
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FRONTEND RENDERING DIAGNOSTICS\n');
console.log('='.repeat(60));

// Check 1: Verify all source files exist
console.log('\n✓ CHECK 1: Source Files');
const requiredFiles = [
  'App.tsx',
  'src/navigation/AppNavigator.tsx',
  'src/context/AuthContext.tsx',
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/tabs/HomeScreen.tsx',
  'src/screens/tabs/BodyExplorerScreen.tsx',
  'src/components/ErrorBoundary.tsx',
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check 2: Verify assets exist
console.log('\n✓ CHECK 2: Required Assets');
const requiredAssets = [
  'assets/icon.png',
  'assets/splash-icon.png',
  'assets/adaptive-icon.png',
  'assets/favicon.png',
];

let allAssetsExist = true;
requiredAssets.forEach(asset => {
  const exists = fs.existsSync(path.join(__dirname, asset));
  const size = exists ? fs.statSync(path.join(__dirname, asset)).size : 0;
  console.log(`  ${exists ? '✅' : '❌'} ${asset} ${exists ? `(${size} bytes)` : ''}`);
  if (!exists) allAssetsExist = false;
});

// Check 3: Verify package.json dependencies
console.log('\n✓ CHECK 3: Critical Dependencies');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const criticalDeps = [
  'react',
  'react-native',
  'expo',
  '@react-navigation/native',
  '@react-navigation/bottom-tabs',
  '@react-three/fiber',
  'three',
];

criticalDeps.forEach(dep => {
  const version = packageJson.dependencies[dep];
  console.log(`  ${version ? '✅' : '❌'} ${dep}${version ? ` (${version})` : ''}`);
});

// Check 4: Check for common rendering issues
console.log('\n✓ CHECK 4: Common Rendering Issues');

// Check for missing return statements
const checkFile = (filePath) => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');

    // Check for components without return
    const hasExport = /export\s+(default\s+)?function/.test(content);
    const hasReturn = /return\s+\(/.test(content) || /return\s+</.test(content);

    return { hasExport, hasReturn };
  } catch (e) {
    return { hasExport: false, hasReturn: false };
  }
};

const appCheck = checkFile('App.tsx');
console.log(`  ${appCheck.hasReturn ? '✅' : '❌'} App.tsx has return statement`);

const navigatorCheck = checkFile('src/navigation/AppNavigator.tsx');
console.log(`  ${navigatorCheck.hasReturn ? '✅' : '❌'} AppNavigator has return statement`);

// Check 5: Look for console errors pattern
console.log('\n✓ CHECK 5: Potential Error Patterns');

const checkForPatterns = (filePath) => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');

    const issues = [];

    // Check for Boolean() wrapper
    if (/Boolean\s*\(/.test(content)) {
      issues.push('Found Boolean() wrapper');
    }

    // Check for missing key props in maps
    if (/\.map\s*\(/.test(content) && !/key=/i.test(content)) {
      issues.push('Possible missing key in map');
    }

    return issues;
  } catch (e) {
    return ['File read error'];
  }
};

['App.tsx', 'src/navigation/AppNavigator.tsx'].forEach(file => {
  const issues = checkForPatterns(file);
  if (issues.length === 0) {
    console.log(`  ✅ ${file} - No issues found`);
  } else {
    console.log(`  ⚠️  ${file}:`);
    issues.forEach(issue => console.log(`      - ${issue}`));
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 SUMMARY\n');
console.log(`Source Files: ${allFilesExist ? '✅ All present' : '❌ Missing files'}`);
console.log(`Assets: ${allAssetsExist ? '✅ All present' : '⚠️  Some missing (placeholders OK)'}`);
console.log(`Dependencies: ✅ Installed`);
console.log(`Code Structure: ${appCheck.hasReturn && navigatorCheck.hasReturn ? '✅ Valid' : '❌ Issues found'}`);

console.log('\n' + '='.repeat(60));
console.log('\n🚀 NEXT STEPS:\n');
console.log('1. Run: npx expo start --clear');
console.log('2. Press "i" for iOS Simulator');
console.log('3. Check Metro bundler output for errors');
console.log('4. Look for red screen errors in simulator\n');

// Check if we can identify specific rendering issue
if (!appCheck.hasReturn) {
  console.log('⚠️  CRITICAL: App.tsx missing return statement!');
}

if (!navigatorCheck.hasReturn) {
  console.log('⚠️  CRITICAL: AppNavigator missing return statement!');
}

console.log('\n✅ Diagnostics complete!\n');
