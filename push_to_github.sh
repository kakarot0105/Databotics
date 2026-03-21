#!/bin/bash
# Push Databotics to GitHub
# Run this script and enter your GitHub token when prompted

cd /Users/bulmanik/clawd/databotics

echo "=== Databotics Git Push Helper ==="
echo ""
echo "To push to GitHub, you need a Personal Access Token."
echo ""
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select scopes: repo (full control)"
echo "4. Generate and copy the token"
echo ""
echo "Paste your token below (input will be hidden):"
read -s TOKEN

echo ""
echo "Setting remote to HTTPS with token..."
git remote set-url origin https://${TOKEN}@github.com/kakarot0105/Databotics.git

echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Databotics pushed to GitHub."
    echo "View at: https://github.com/kakarot0105/Databotics"
else
    echo ""
    echo "❌ Push failed. Check your token and try again."
fi

# Reset remote to not store token in config
git remote set-url origin https://github.com/kakarot0105/Databotics.git
