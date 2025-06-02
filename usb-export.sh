#!/bin/bash
# Kisan Khata Sahayak - USB Export Script
# Purpose: Export full offline version under 50MB

set -e

echo "INFO: Starting USB export process..."

# Step 1: Clean old builds
echo "INFO: Cleaning previous builds (out/, portable_build/, kisan-khata-offline.zip)..."
rm -rf .next
rm -rf out
rm -rf portable_build
rm -f kisan-khata-offline.zip

# Step 2: Static build with Next.js
# next.config.ts already has output: 'export', so `next build` handles export to `out/`
echo "INFO: Running Next.js static build and export..."
npm run build

# Step 3: Prepare portable folder structure
echo "INFO: Preparing portable_build directory..."
mkdir -p portable_build/data # For potential future use (user data, config)
cp -r out/ portable_build/app_files # Renamed 'out' to 'app_files' for clarity within zip
# Copy public folder if it contains essential static assets not handled by Next.js build (e.g., root level manifest.json, favicons not via next/image)
if [ -d "public" ]; then
  echo "INFO: Copying public assets..."
  cp -r public/* portable_build/app_files/ 2>/dev/null || true # Copy contents, ignore if public is empty or specific files fail
fi

# Create a simple index.html redirect if the main one is nested
# This helps if the user just opens the root of the extracted zip
cat <<EOF > portable_build/index.html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Kisan Khata Sahayak - Redirecting...</title>
    <meta http-equiv="refresh" content="0;url=./app_files/index.html">
    <script type="text/javascript">
        window.location.href = "./app_files/index.html";
    </script>
</head>
<body>
    <p>If you are not redirected automatically, <a href="./app_files/index.html">click here</a>.</p>
</body>
</html>
EOF

echo "INFO: Creating launch instructions..."
cat <<EOF > portable_build/HOW_TO_RUN.txt
To run Kisan Khata Sahayak:
1. Extract the 'kisan-khata-offline.zip' file.
2. Open the 'portable_build' folder.
3. Open the 'index.html' file in your web browser.
   Alternatively, open the 'app_files/index.html' file.

For offline data persistence, ensure your browser allows file system access or data storage for local files, or use a portable browser setup.
EOF


# Step 4: Strip dev files (source maps) to reduce size
echo "INFO: Removing source maps to reduce size..."
find portable_build/app_files/_next/static/ -name "*.js.map" -type f -delete
find portable_build/app_files/_next/static/ -name "*.css.map" -type f -delete


# Step 5: Bundle into a zip file
echo "INFO: Zipping the portable_build directory..."
cd portable_build
zip -r ../kisan-khata-offline.zip . -x "*.DS_Store" # Exclude macOS specific files
cd ..

# Clean up the temporary portable_build directory after zipping
rm -rf portable_build

# Final status
echo ""
echo "✅ USB Export complete!"
echo "   Final archive: kisan-khata-offline.zip (~$(du -sh kisan-khata-offline.zip | cut -f1))"
echo "👉 You can extract 'kisan-khata-offline.zip' onto a USB drive."
echo "   To run, extract and open 'index.html' (or 'app_files/index.html') from the extracted folder in any modern web browser."
echo ""
echo "💡 To make it a self-running .exe, you would later integrate a lightweight runtime like Tauri or a minimal Electron setup."
echo "   This script provides the static web content."
echo ""
