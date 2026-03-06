#!/usr/bin/env node

/**
 * Creates minimal valid PNG files for app assets
 * These are 1x1 pixel images that prevent build errors
 * Replace with proper assets before production
 */

const fs = require('fs');
const path = require('path');

// Minimal 1x1 red PNG (base64 encoded)
const redPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal 1x1 black PNG
const blackPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
  'base64'
);

const assets = {
  'icon.png': redPixel,
  'adaptive-icon.png': redPixel,
  'favicon.png': redPixel,
  'splash-icon.png': blackPixel,
};

Object.entries(assets).forEach(([filename, data]) => {
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, data);
  console.log(`✓ Created ${filename}`);
});

console.log('\n✅ Minimal placeholder assets created!');
console.log('⚠️  These are 1x1 pixel placeholders - replace with proper assets before production\n');
