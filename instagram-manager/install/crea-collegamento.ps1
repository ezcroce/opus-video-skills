# Crea un collegamento "Custode" sul Desktop di Windows, con la sua icona.
# Si avvia con doppio clic su "Crea collegamento sul desktop.bat".
$ErrorActionPreference = "Stop"

$root   = Split-Path -Parent $PSScriptRoot
$vbs    = Join-Path $root "Avvia Custode (senza finestra).vbs"
$icon   = Join-Path $root "assets\icon.ico"
$desktop = [Environment]::GetFolderPath("Desktop")
$link   = Join-Path $desktop "Custode.lnk"

if (-not (Test-Path $vbs)) {
  Write-Host "Non trovo 'Avvia Custode (senza finestra).vbs' in $root" -ForegroundColor Red
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($link)
$shortcut.TargetPath = Join-Path $env:WINDIR "System32\wscript.exe"
$shortcut.Arguments = '"' + $vbs + '"'
$shortcut.WorkingDirectory = $root
if (Test-Path $icon) { $shortcut.IconLocation = $icon + ",0" }
$shortcut.Description = "Custode - assistente della community Instagram"
$shortcut.Save()

Write-Host ""
Write-Host "Fatto. Sul desktop ora c'e il collegamento 'Custode'." -ForegroundColor Green
Write-Host "Doppio clic per aprire l'app."
Start-Sleep -Seconds 3
