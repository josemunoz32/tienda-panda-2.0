@echo off
REM Activar entorno virtual
call ..\.venv\Scripts\activate.bat
REM Ejecutar el bot
python bot.py
pause
