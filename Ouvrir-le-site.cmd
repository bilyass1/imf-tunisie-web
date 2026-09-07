@echo off
cd /d "%~dp0"
node scripts/open-preview.mjs
if errorlevel 1 pause
