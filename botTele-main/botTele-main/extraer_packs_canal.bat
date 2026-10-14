@echo off
chcp 65001 > nul
title Extractor Masivo de Packs - Panda Store
cd /d "%~dp0"

echo 🚀 Iniciando Extractor Masivo de Packs...
..\.venv\Scripts\python.exe clonar_canal.py
pause
