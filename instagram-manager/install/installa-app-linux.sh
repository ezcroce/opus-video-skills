#!/bin/sh
# Installa Custode nel menu delle applicazioni (solo per l'utente corrente).
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
APPS="$HOME/.local/share/applications"
ICONS="$HOME/.local/share/icons/hicolor/512x512/apps"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non trovato. Installa Node 18+ e riprova."
  exit 1
fi

NODE=$(command -v node)
mkdir -p "$APPS" "$ICONS"
cp "$ROOT/assets/icon-512.png" "$ICONS/custode.png"
chmod +x "$ROOT/Avvia Custode.sh"

cat > "$APPS/custode.desktop" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Custode
GenericName=Assistente Instagram
Comment=Risponde a commenti e direct con calma e gentilezza
Exec="$NODE" "$ROOT/app/launcher.mjs"
Path=$ROOT
Icon=$ICONS/custode.png
Terminal=false
Categories=Network;Office;
StartupNotify=true
StartupWMClass=Custode
EOF

chmod +x "$APPS/custode.desktop"
update-desktop-database "$APPS" 2>/dev/null || true
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true

echo "Installato. Cerca «Custode» nel menu delle applicazioni."
echo "Per rimuoverlo: rm \"$APPS/custode.desktop\" \"$ICONS/custode.png\""
