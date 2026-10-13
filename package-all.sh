#!/bin/bash
# Build unsigned distributables for Mac (Apple Silicon + Intel) and Windows.
# These are NOT code-signed: users will see a one-time security warning
# (Mac: right-click -> Open; Windows: More info -> Run anyway).
# For signed releases, see release.sh (needs an Apple Developer identity).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Installing dependencies"
npm install

echo "==> Building Mac (Apple Silicon)"
npm run package:mac-arm

echo "==> Building Mac (Intel)"
npm run package:mac-intel

echo "==> Building Windows (64-bit)"
npm run package:win

echo "==> Zipping"
cd dist
zip -qry Vel-mac-arm64.zip Vel-darwin-arm64
zip -qry Vel-mac-x64.zip Vel-darwin-x64
zip -qry Vel-win-x64.zip Vel-win32-x64
cd ..

echo
echo "Done. Upload these to GitHub Releases:"
ls -la dist/*.zip
