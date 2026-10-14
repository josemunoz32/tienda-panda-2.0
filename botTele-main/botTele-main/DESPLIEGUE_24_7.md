# Despliegue de Panda Store Telegram Bot en Render (24/7)

Para que tu bot funcione **las 24 horas del día sin depender de tener tu PC encendida**, puedes usar el servicio gratuito o de bajo costo de **Render** (o Railway) como un Worker continuo.

## 1. Crear el Servicio en Render
1. Entra a [dashboard.render.com](https://dashboard.render.com).
2. Haz clic en **New +** > **Background Worker**.
3. Conecta tu repositorio de GitHub: `josemunoz32/tienda-panda-2.0`.
4. Configura los siguientes campos:
   - **Name:** `pandastore-telegram-bot`
   - **Root Directory:** `botTele-main/botTele-main`
   - **Environment:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python bot.py`

## 2. Variables de Entorno en Render
En la pestaña **Environment** de tu servicio en Render, agrega las siguientes variables (las mismas de tu `.env`):

| Variable | Valor |
| :--- | :--- |
| `TELEGRAM_TOKEN` | Tu token del bot de Telegram (`123456789:ABC...`) |
| `CANAL_PUBLICO_ID` | `-1001553070593` (o el canal definitivo cuando termines pruebas) |
| `CANAL_REVENDEDORES_ID` | `0` (o el ID del canal de revendedores) |
| `ADMIN_ID` | `5158777962` |
| `TELEGRAM_CONTACT` | `NintendoChile2` |
| `INSTAGRAM_URL` | `https://www.instagram.com/juegos_nintendo_switch_chile` |
| `MARGEN_PUBLICO` | `13000` |
| `MARGEN_REVENDEDOR` | `6000` |

> [!NOTE]
> Para el archivo de Firebase (`firebase-key.json`), puedes crearlo en Render como un **Secret File** con la ruta `/etc/secrets/firebase-key.json` y apuntar `FIREBASE_KEY_PATH` a esa ruta.
