# Plan Maestro de Implementación — PandaStore 2.0

> [!IMPORTANT]
> **Estado:** Modo de planificación. **No se ha ejecutado ningún cambio en el código ni en la base de datos.** Todo comenzará una vez que apruebes el orden de las fases.

---

## 📍 Respuesta Inmediata: Ruta Exacta del archivo JSON para el Bot

Para que el bot de Telegram suba los packs nuevos a los canales y a Firebase:

* **Ruta exacta del archivo:**  
  `c:\Users\Usuario\proyectopandastore20\botTele-main\botTele-main\result.json`

### ⚠️ Detalle técnico clave sobre la subida:
El script `publicar_masivo.py` guarda un registro de los packs ya publicados en `progreso_publicacion.json` para no repetir envíos en el canal. 
* Si reemplazas `result.json` por el archivo nuevo y quieres que **suba únicamente los packs que no se hayan publicado antes**, simplemente se ejecuta:
  ```powershell
  python publicar_masivo.py
  ```
* Si deseas que **analice y publique todos los packs desde cero**, se ejecuta con el flag de reinicio:
  ```powershell
  python publicar_masivo.py --reiniciar
  ```
* Al ejecutarse, cada pack queda automáticamente publicado en los canales de Telegram y guardado en la colección `packs_nintendo` de Firestore.

---

## 🗺️ Desglose del Plan por Fases

---

### Fase 1: Steam — Limpieza de Duplicados, Juegos Incompatibles y "Producto no encontrado"

1. **Corrección de "Producto no encontrado" (Error 404 en fichas de producto):**
   * **Causa raíz:** En [ProductDetail.js](file:///c:/Users/Usuario/proyectopandastore20/src/pages/Productos/ProductDetail.js), el extractor de URL maneja formatos tipo `slug--ID`. Al buscar por slug o en catálogos auxiliares (`steamImportData`, Firestore o Ryuu), cuando el producto no posee campo `slug` exacto o proviene de categorías como Streaming o PlayStation, la búsqueda colapsa y arroja *"Producto no encontrado"*.
   * **Solución:** Implementar un resolver robusto de 4 niveles:
     1. Búsqueda por ID directo de Firestore (limpiando prefijos).
     2. Búsqueda por campo `slug` normalizado.
     3. Búsqueda por similitud de nombre limpio en Firestore.
     4. Fallback a catálogo local o generación dinámica de ficha sin romper la interfaz.

2. **Limpieza profunda de duplicados en Steam:**
   * Consolidar títulos repetidos (ej. *The Last of Us Part I* apareciendo múltiples veces).
   * Dejar **un único producto maestro por juego**, con su `app_id` verificado, imagen oficial de Steam CDN y sus DLCs vinculados.

3. **Exclusión de juegos con verificación/Denuvo/2FA:**
   * Purgar y ocultar del catálogo Steam los juegos que dan problemas de verificación continua:
     * *NBA 2K25* y anteriores.
     * *TopSpin 2K25*.
     * *EA Sports FC 25* y anteriores.
     * Otros títulos que requieran activación telefónica o bloqueo Denuvo persistente.

---

### Fase 2: Nintendo Switch — Sincronización de Stock con Packs y "Publicar Rápido"

1. **Conexión en tiempo real con `packs_nintendo`:**
   * El catálogo de Nintendo Switch leerá directamente la colección `packs_nintendo` de Firestore (alimentada por el bot de Telegram).
   * **Lógica de stock:**
     * Si un juego (ej. *Mario Kart 8 Deluxe*) está presente en al menos 1 pack activo 👉 Se muestra **Disponible** con la cantidad de packs en los que está incluido.
     * Si un juego **no existe en ningún pack** subido por el bot 👉 Se marca automáticamente como **"Agotado"**, bloqueando la compra y mostrando el botón de *Consultar / Encargar por WhatsApp*.

2. **Módulo "Sin Publicar de Nintendo" en el Admin:**
   * Panel rápido para listar juegos que existen en el catálogo base pero no están publicados o carecen de pack, permitiendo crearlos o activarlos con 1 clic.

---

### Fase 3: CRUD de Precios, Dólar Fijo ($900) y Reglas de Revendedores

1. **Valor Dólar Centralizado y Fijo en $900 CLP:**
   * Crear en Firestore (colección `config/monedas`) el parámetro global `dolar_fijo: 900`.
   * Campo editable desde el panel de administración.
   * **Conversión global reactiva:** Toda la tienda tomará este valor central. Si cambias el dólar a $920 o $950 en el admin, **todos los precios en USD y monedas extranjeras se recalcularán automáticamente en toda la web**, sin necesidad de editar producto por producto.

2. **CRUD de Productos simplificado:**
   * Al agregar o editar cualquier producto, el administrador **solo ingresa el valor en CLP** que desea cobrar/ganar.
   * El sistema calcula en vivo la equivalencia en USD (`precioCLP / valorDolar`) y guarda los datos de manera limpia.

3. **Revisión Integral del Módulo de Revendedores:**
   * Descuentos mayoristas automáticos según categoría (ej. -$5.000 CLP en PlayStation, precios preferenciales en Steam y Switch).
   * Verificación de saldo en billetera virtual.
   * Alerta de saldo insuficiente con botón directo a recargar.
   * Panel de validación de recargas manuales (por transferencia o WhatsApp).

---

### Fase 4: Pasarela Binance Pay (Pagos con Criptomonedas)

1. **Integración de Binance Pay API oficial:**
   * Configuración de credenciales de comerciante Binance Pay (`binance_api_key`, `binance_secret_key`).
   * Creación de orden mediante Cloud Functions con Webhook de notificación instantánea.

2. **Habilitación en los 4 flujos de pago:**
   * **Checkout Carrito:** `/checkout-carrito`
   * **Checkout Compra Directa:** `/comprar-ahora`
   * **Recarga de Billetera Revendedor:** `/recargar-billetera`
   * **Packs Personalizados:** `/checkout-pack`

---

### Fase 5: Limpieza del Panel Admin y Rediseño Web & Móvil

1. **Limpieza y Consolidación del Panel Admin:**
   * Eliminar pestañas y botones redundantes o en desuso.
   * Unificar gestión de usuarios y revendedores en una vista coherente.
   * Optimizar la velocidad de carga de las tablas.

2. **Rediseño UI/UX de Fichas de Producto y Licencias:**
   * Mejorar la visualización en dispositivos móviles (botones táctiles grandes, selección fluida de variantes).
   * Presentación clara y estética de los formatos de entrega (Cuenta Primaria/Secundaria, Códigos, Steam Launcher).

3. **Nueva sección de Preguntas Frecuentes (FAQ):**
   * Acordeón moderno y visual con respuestas directas: cómo activar cuentas, cómo funciona el launcher, métodos de pago, garantías y soporte.

---

### Fase 6 (Al Final): PandaStore Launcher (.NET C# Desktop)

*(Tal como solicitaste, esto queda para la última etapa)*

1. **Fusión y Auto-actualizador:**
   * Unificar el ejecutable principal con el sistema de verificación de versión para que se auto-actualice sin reinstalaciones manuales.

2. **Detección inteligente de DLCs:**
   * Si el usuario compra el juego base y tiempo después adquiere o consulta por los DLCs, el launcher los detectará y los inyectará en la licencia correspondiente.
   * Si no los tiene comprados, mostrará la opción de adquirirlos directamente (con botón a WhatsApp o pasarela).

3. **Pagos Directos en el Launcher (Mercado Pago + Binance Pay):**
   * Pasarela de pago integrada dentro del launcher para compras sin salir del programa, activando la licencia al instante tras la confirmación del pago.

4. **Perfil del Usuario y Sistema de Recompensas:**
   * Pestaña de perfil con estadísticas completas: fecha de registro, total de juegos adquiridos, nivel de cliente y regalos/beneficios por fidelidad tras cierta cantidad de compras.

---

### ¿Cómo empezamos?
Revisa este orden de trabajo. Si estás de acuerdo, podemos comenzar de inmediato con la **Fase 1** (resolver los errores 404 de *"Producto no encontrado"* y limpiar los duplicados y juegos con verificación en Steam).