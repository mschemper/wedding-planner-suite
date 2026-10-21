@echo off
rem Opens Claude Code (WSL Ubuntu) in this repository.
wsl.exe --cd "%~dp0." -- bash -lc "claude"
if errorlevel 1 pause
