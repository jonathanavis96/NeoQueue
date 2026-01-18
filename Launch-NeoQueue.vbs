Set WshShell = CreateObject("WScript.Shell")
' Launch NeoQueue AppImage via WSL (no terminal window)
WshShell.Run "wsl bash -c ""cd /home/grafe/code/NeoQueue && ./release/NeoQueue-1.0.0.AppImage""", 0, False
