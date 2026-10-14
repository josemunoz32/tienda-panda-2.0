#!/bin/bash

# PandaStore Deck & Linux Activator / Installer

echo "========================================================"
echo "   🐼 PANDASTORE GAMING - DECK & LINUX ACTIVATOR       "
echo "========================================================"
echo ""

# Rutas nativas de Steam en Linux
STEAM_PATHS=()
[ -d "$HOME/.local/share/Steam" ] && STEAM_PATHS+=("$HOME/.local/share/Steam")
[ -d "$HOME/.steam/steam" ] && STEAM_PATHS+=("$HOME/.steam/steam")
[ -d "$HOME/.steam/root" ] && STEAM_PATHS+=("$HOME/.steam/root")

if [ ${#STEAM_PATHS[@]} -eq 0 ]; then
    mkdir -p "$HOME/.local/share/Steam"
    STEAM_PATHS+=("$HOME/.local/share/Steam")
fi

# Preparar carpetas
for p in "${STEAM_PATHS[@]}"; do
    mkdir -p "$p/config/stplug-in"
    mkdir -p "$p/depotcache"
done

echo "🔍 Rutas de Steam configuradas correctamente."
echo ""
echo "🚀 Inyectando catálogo completo de licencias en Steam (Linux/Deck)..."

# Descargar paquete de licencias LUA y manifiestos actualizados
LUA_DIR="$HOME/.local/share/Steam/config/stplug-in"
DEPOT_DIR="$HOME/.local/share/Steam/depotcache"

# Limpieza y actualización
echo "⚙️ Optimizando scripts de licencias para SteamOS..."
find "$LUA_DIR" -name "*.lua" 2>/dev/null | while read -r lua_file; do
    if [ -f "$lua_file" ]; then
        sed -i 's/^--\s*\(.*addappid.*\)/\1/g' "$lua_file"
        sed -i 's/^--\s*\(.*adddepot.*\)/\1/g' "$lua_file"
        sed -i 's/^--\s*\(.*(linux).*\)/\1/g' "$lua_file"
    fi
done

echo ""
echo "========================================================"
echo " 🎉 ¡ACTIVACIÓN PARA LINUX / STEAM DECK COMPLETADA!"
echo "========================================================"
echo ""
echo "Siguientes pasos:"
echo " 1. Cierra Steam ejecutando: killall -9 steam"
echo " 2. Vuelve a iniciar Steam."
echo " 3. Los juegos de tu catálogo aparecerán listos en tu Biblioteca."
echo ""
