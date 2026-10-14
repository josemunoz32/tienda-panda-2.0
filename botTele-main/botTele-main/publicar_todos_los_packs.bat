@echo off
title Publicador Masivo Panda Store (1400+ Packs)
chcp 65001 > nul
cd /d "%~dp0"

echo =================================================================
echo   🐼 PANDA STORE - PUBLICADOR MASIVO DE PACKS NINTENDO SWITCH
echo =================================================================
echo.
echo  Este proceso subira de forma continua y ordenada todos los packs
echo  de result.json tanto al Canal Publico como a Revendedores y Firebase.
echo.
echo  [1] Continuar o reanudar subida de packs pendientes
echo  [2] Reiniciar subida desde CERO (ignorar historial previo)
echo  [3] Salir
echo.
set /p opcion="👉 Elige una opción (1, 2 o 3): "

if "%opcion%"=="1" (
    echo.
    echo 🚀 Iniciando subida de packs pendientes...
    python publicar_masivo.py
) else if "%opcion%"=="2" (
    echo.
    echo ⚠️ Reiniciando subida desde el inicio...
    python publicar_masivo.py --reiniciar
) else (
    echo Saliendo...
    exit /b
)

echo.
echo Presiona cualquier tecla para cerrar.
pause > nul
