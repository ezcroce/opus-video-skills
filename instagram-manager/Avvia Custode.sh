#!/bin/sh
# Linux: avvia Custode come app in una finestra dedicata.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Per avviare Custode serve Node.js (versione 18 o superiore)."
  echo "Installa con il gestore della tua distribuzione, poi riprova."
  if command -v zenity >/dev/null 2>&1; then
    zenity --error --text="Per avviare Custode serve Node.js (versione 18 o superiore)." 2>/dev/null
  fi
  exit 1
fi

exec node app/launcher.mjs
