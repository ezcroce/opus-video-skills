#!/bin/bash
# Crea "Custode.app" con la sua icona, così si apre dal Launchpad o dal Dock.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/Custode.app"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non trovato. Installa Node 18+ (nodejs.org) e riprova."
  exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$ROOT/assets/icon.icns" "$APP/Contents/Resources/icon.icns"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Custode</string>
  <key>CFBundleDisplayName</key><string>Custode</string>
  <key>CFBundleIdentifier</key><string>local.custode.instagram</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Custode</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/Custode" <<LAUNCH
#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:\$PATH"
cd "$ROOT" || exit 1
exec node app/launcher.mjs
LAUNCH

chmod +x "$APP/Contents/MacOS/Custode"

# firma ad-hoc: evita l'avviso "app danneggiata" sui Mac recenti
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo "Creata: $APP"
echo "Trascinala in Applicazioni se vuoi averla nel Launchpad."
open -R "$APP" 2>/dev/null || true
