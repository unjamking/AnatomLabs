#!/bin/bash

# This script creates placeholder images for the app
# Requires ImageMagick (install with: brew install imagemagick)

ASSETS_DIR="./assets"

# Check if ImageMagick is available
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Please install it with: brew install imagemagick"
    echo "Or manually create the following files in ./assets/:"
    echo "  - icon.png (1024x1024)"
    echo "  - splash-icon.png (1242x2436)"
    echo "  - adaptive-icon.png (1024x1024)"
    echo "  - favicon.png (48x48)"
    exit 1
fi

# Create icon.png (1024x1024)
convert -size 1024x1024 xc:"#e74c3c" \
  -gravity center \
  -pointsize 200 \
  -fill white \
  -font "Helvetica-Bold" \
  -annotate +0+0 "AL+" \
  "$ASSETS_DIR/icon.png"

# Create splash-icon.png (1242x2436)
convert -size 1242x2436 xc:"#0a0a0a" \
  -gravity center \
  -pointsize 300 \
  -fill "#e74c3c" \
  -font "Helvetica-Bold" \
  -annotate +0-200 "AnatomLabs+" \
  -pointsize 80 \
  -fill "#888888" \
  -annotate +0+100 "Human Performance Science" \
  "$ASSETS_DIR/splash-icon.png"

# Create adaptive-icon.png (1024x1024)
cp "$ASSETS_DIR/icon.png" "$ASSETS_DIR/adaptive-icon.png"

# Create favicon.png (48x48)
convert -size 48x48 xc:"#e74c3c" \
  -gravity center \
  -pointsize 24 \
  -fill white \
  -font "Helvetica-Bold" \
  -annotate +0+0 "AL" \
  "$ASSETS_DIR/favicon.png"

echo "✅ Placeholder assets created successfully!"
