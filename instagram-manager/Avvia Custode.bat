@echo off
chcp 65001 >nul
title Custode - assistente Instagram
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Per avviare Custode serve Node.js.
  echo   Scaricalo da https://nodejs.org ^(versione LTS^), installalo e riprova.
  echo.
  pause
  exit /b 1
)

if not exist "app\launcher.mjs" (
  echo   Avvia questo file dalla cartella instagram-manager.
  pause
  exit /b 1
)

node "app\launcher.mjs"
if errorlevel 1 (
  echo.
  echo   Qualcosa non ha funzionato. Dettagli in data\launcher.log
  pause
)
