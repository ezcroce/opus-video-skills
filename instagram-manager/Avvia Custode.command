#!/bin/bash
# macOS: doppio clic per avviare Custode come app.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Per avviare Custode serve Node.js (versione LTS). Vuoi aprire la pagina di download?" buttons {"Annulla", "Apri nodejs.org"} default button "Apri nodejs.org"' >/dev/null 2>&1
  open "https://nodejs.org/it" 2>/dev/null
  exit 1
fi

exec node app/launcher.mjs
