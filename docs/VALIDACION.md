# Verificación de fotos, Docker y CI

Validación original del 15 de octubre de 2026 y revisión completa repetida el **24 de octubre de 2026** sobre el repositorio del primer parcial.

## Resultados locales

- `npm test`: **19 pruebas aprobadas, cero fallos** (18 escenarios y el grupo principal).
- Compilación TypeScript correcta con Node.js 22.
- PostgreSQL 16 real; base temporal eliminada al terminar las pruebas.
- Migración inicial sin cambios; migración de fotos aplicada, revertida y reaplicada. Se comprobó que conserva un reporte anterior con URL nulas y que el esquema coincide con las entidades. `synchronize` sigue en `false`.
- Registro, hash bcrypt, login, errores de credenciales, duplicados y preferencias de notificación comprobados.
- POST multipart con imagen real de prueba: SDK S3 ejecuta PUT, transmite los mismos bytes y el Content-Type detectado, guarda URL pública y envía correo con `<img>` y los cuatro datos escapados.
- Foto ausente, vacía, falsa, demasiado grande o con nombre de campo incorrecto: rechazo sin subir, guardar ni enviar correo.
- Campos del servidor enviados por el ciudadano: rechazo. Se verificaron `photoUrl`, `repairPhotoUrl`, `isResolved`, ID y fecha.
- PATCH de cierre: requiere foto, comprueba ID, sube a `repairs/`, guarda URL y cambia `isResolved`; un segundo cierre falla sin otra subida.
- GET devuelve ambas URL y su estado persistido.
- Fallos S3: no crean ni cierran reportes. Fallo SMTP: conserva el reporte guardado, como en el primer parcial.
- `npm audit`: cero vulnerabilidades al 24 de octubre de 2026. La revisión detectó seis avisos nuevos; se actualizaron los paquetes afectados y se fijó Multer 2.5.0 mediante `overrides`, ya que NestJS 11 fija Multer 2.4.0. Se verificó con body-parser 2.4.0 y Nodemailer 10.2.1. Las 19 pruebas volvieron a pasar después de la actualización.
- Workflow comprobado sin errores con actionlint; colección Postman con seis peticiones y JSON válido.

## Docker ejecutado

Se volvió a construir la imagen con el Dockerfile de `node:22-alpine` **para Linux AMD64 y ARM64** el 24 de octubre. Se ejecutó el Compose de entrega con la imagen local nativa ARM64 para verificarla. No se descargó una imagen publicada propia en Docker Hub.

Se comprobó en contenedores:

1. PostgreSQL saludable → contenedor de migraciones termina correctamente → API inicia.
2. GET vacío, POST multipart con foto, correo HTML recibido, cierre con foto y GET con ambas URL.
3. S3 recibe los bytes originales de las dos imágenes mediante el SDK real.
4. La imagen final no contiene `.env`, `.env.example`, `compose.yaml`, `compose.dev.yaml` ni `.git`.
5. La API se ejecuta como usuario `node`, UID 1000.
6. Se eliminaron los contenedores y el volumen temporal utilizados para verificar.

Los servidores SMTP y HTTP del protocolo S3 eran dobles locales. Estas verificaciones no acreditan entrega a un buzón externo, permisos públicos de un bucket AWS ni publicación en Docker Hub.

## CI y publicación pendientes de la cuenta

El workflow se dispara con push a `main`, hace login con `secrets.DOCKER_USER` y `secrets.DOCKER_PASSWORD` y construye/publica `latest` para AMD64 y ARM64. Las referencias de las Actions se fijaron a sus commits oficiales.

Al revisar el repositorio el 24 de octubre: PR #1 abierto en borrador, sin integrar; `main` en el commit `23ea676` del primer parcial; cero Secrets de Actions y cero ejecuciones de workflows. No existía un `.env` local configurado. Los Secrets de Docker Hub todavía no estaban configurados. Falta agregarlos, crear el repositorio público de Docker Hub y ejecutar el workflow en `main`. La ejecución verde y la URL final de la imagen deben comprobarse después de esos pasos.

También se requiere configurar el bucket/identidad AWS y el proveedor SMTP reales en `.env`. No se incorporaron credenciales reales al código, al Dockerfile, al workflow ni al repositorio.

El video queda a cargo del alumno; `docs/VIDEO.md` describe la secuencia exigida y `postman/AguaFix.postman_collection.json` contiene las peticiones.

La guía completa de preparación, pruebas manuales, grabación en orden y entrega está en [PRUEBAS_Y_EVIDENCIA.md](PRUEBAS_Y_EVIDENCIA.md).
