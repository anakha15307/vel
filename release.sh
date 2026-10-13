#!/bin/bash
# Build Vel.app, sign it with the Developer ID certificate, notarize it with Apple, and zip it.
# Notarization needs a saved keychain profile (one-time setup, run by you in Terminal):
#   xcrun notarytool store-credentials "vel-notary" --apple-id "<apple id>" --team-id "25Q4HQ7URV"
set -euo pipefail
cd "$(dirname "$0")"

IDENTITY="Developer ID Application: Anoop Kumar Latha (25Q4HQ7URV)"
PROFILE="vel-notary"
APP="dist/Vel-darwin-arm64/Vel.app"

echo "==> Building"
npm run package

echo "==> Signing with Developer ID (hardened runtime)"
# The osx-sign CLI rejects --identity in this version, so call its API directly.
node --input-type=module -e "
import { sign } from '@electron/osx-sign';
await sign({ app: process.argv[1], identity: process.argv[2] });
" "$APP" "$IDENTITY"
codesign --verify --deep --strict "$APP"
codesign -dv "$APP" 2>&1 | grep -E "Authority=Developer ID Application|flags="

if ! xcrun notarytool history --keychain-profile "$PROFILE" >/dev/null 2>&1; then
  echo
  echo "Signed, but NOT notarized: no saved notarization profile named '$PROFILE'."
  echo "Run once in Terminal, then run this script again:"
  echo "  xcrun notarytool store-credentials \"$PROFILE\" --apple-id \"<apple id>\" --team-id \"25Q4HQ7URV\""
  exit 2
fi

echo "==> Notarizing (this can take a few minutes)"
ditto -c -k --keepParent "$APP" dist/Vel-notarize.zip
xcrun notarytool submit dist/Vel-notarize.zip --keychain-profile "$PROFILE" --wait
xcrun stapler staple "$APP"
rm dist/Vel-notarize.zip

echo "==> Checking Gatekeeper"
spctl -a -vvv -t exec "$APP"

echo "==> Zipping for sharing"
ditto -c -k --keepParent "$APP" dist/Vel.zip
echo "Done: dist/Vel.zip"
