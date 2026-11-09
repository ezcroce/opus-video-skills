' Avvia Custode senza mostrare la finestra nera del terminale.
' Utile per il collegamento sul desktop: doppio clic e si apre solo l'app.
Option Explicit

Dim fso, shell, base
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = base

If Not fso.FileExists(base & "\app\launcher.mjs") Then
  MsgBox "Avvia questo file dalla cartella instagram-manager.", 16, "Custode"
  WScript.Quit 1
End If

shell.Run "cmd /c node ""app\launcher.mjs""", 0, False
