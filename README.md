
## PandaStore

Aplicación React con Firebase para catálogo, pagos, soporte y administración.

### Desarrollo

- `npm start`: inicia el sitio.
- `npm run build`: genera la versión de producción.
- `npm run lint --prefix functions`: revisa las funciones de servidor.

### Seguridad y despliegue

Antes de desplegar, configura los secretos en Firebase/Cloud Functions: `TELEGRAM_TOKEN`,
`ADMIN_ID`, credenciales de pagos, correo y los valores de `ALLOWED_ORIGINS`. No uses
credenciales en el código ni subas archivos `.env` o claves de servicio al repositorio.

Las rutas administrativas, licencias y soporte requieren una sesión Firebase válida. La
asignación del rol `admin` debe hacerse exclusivamente desde un entorno de confianza con
Firebase Admin SDK; nunca desde el navegador.
