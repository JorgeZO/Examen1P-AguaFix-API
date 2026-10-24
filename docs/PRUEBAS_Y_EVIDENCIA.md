# AguaFix: preparar, probar y grabar la evidencia

Revisión del 24 de octubre de 2026. La API se probó con PostgreSQL real, SMTP local y un servidor local que recibe las peticiones del SDK S3. Esto comprueba el código; la evidencia del examen requiere además tu bucket S3, tu buzón y la imagen realmente publicada.

Docker Hub y GitHub ya quedaron configurados para esta cuenta: PR #1 integrado en `main`, Secrets guardados y [publicación inicial en verde](https://github.com/JorgeZO/Examen1P-AguaFix-API/actions/runs/40129536399). La imagen pública es [jorgezo/aguafix-api:latest](https://hub.docker.com/r/jorgezo/aguafix-api). Continúa con S3 en el paso 2; el paso 1 se conserva como referencia. El bucket y el correo reales todavía requieren configuración.

## 1. Docker Hub y GitHub — ya configurados en este proyecto

1. Entra a [Docker Hub](https://hub.docker.com/) con tu cuenta y crea un repositorio **público** llamado `aguafix-api`.
2. En Docker Home → tu avatar → Account settings → Personal access tokens, genera un token con permisos para leer y publicar imágenes. Copia el token para guardarlo directamente en GitHub. [Instrucciones oficiales de Docker](https://docs.docker.com/security/access-tokens/personal-access-tokens/).
3. Abre los [Secrets del repositorio](https://github.com/JorgeZO/Examen1P-AguaFix-API/settings/secrets/actions) y crea dos **Repository secrets**, con estos nombres exactos:

| Nombre | Valor |
|---|---|
| `DOCKER_USER` | Tu usuario de Docker Hub; no tu correo ni necesariamente tu usuario de GitHub |
| `DOCKER_PASSWORD` | El token de Docker Hub con permiso de escritura |

Los Secrets se agregan desde Settings → Secrets and variables → Actions → New repository secret. No agregues estos valores al workflow. [Documentación de GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

4. Con los Secrets guardados, abre el [PR #1](https://github.com/JorgeZO/Examen1P-AguaFix-API/pull/1), pulsa **Ready for review** y después **Merge pull request** → confirma la integración en `main`.
5. Abre [Actions](https://github.com/JorgeZO/Examen1P-AguaFix-API/actions). La integración debe iniciar el workflow. Espera el resultado verde antes de descargar tu imagen.

## 2. Preparar S3

1. Crea un bucket de propósito general con un nombre único, en minúsculas y sin puntos. Anota el nombre y la región exacta. Mantén las ACL desactivadas y utiliza cifrado administrado por S3, para esta configuración.
2. Da a la identidad IAM utilizada por la API permiso `s3:PutObject` sobre los prefijos `reports/*` y `repairs/*`. Usa `docs/s3-upload-policy.json`, sustituyendo `NOMBRE_DEL_BUCKET`. Esa política va en los permisos de la identidad IAM.
3. En el bucket → Permissions → Bucket policy, aplica `docs/s3-public-read-policy.json`, sustituyendo el mismo nombre. Esa política permite lectura anónima únicamente de los objetos de esos dos prefijos.
4. El bloqueo de acceso público debe permitir políticas públicas: revisa `BlockPublicPolicy` y `RestrictPublicBuckets` a nivel del bucket y, si impiden esa política, a nivel de cuenta u organización. Puedes mantener el bloqueo de ACL públicas. No habilites escritura pública. [Permisos públicos y bloqueo de S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/granting-public-access.html).
5. Obtén las credenciales de esa identidad para la API y colócalas únicamente en el `.env` local. Si son temporales, incluye `AWS_SESSION_TOKEN`. No utilices claves de la cuenta root.

No necesitas crear las carpetas manualmente: los prefijos aparecen al subir los objetos.

## 3. Preparar el código y el archivo local de configuración

En este equipo, el proyecto se encuentra en:

```bash
cd /Users/jorgezo/Documents/Codex/2026-10-15/el-municipio-quiere-que-aguafix-acepte/outputs/Examen1P-AguaFix-API
git switch main
git pull --ff-only origin main
npm ci
npm run build
```

Ejecuta lo anterior después de integrar el PR. Si trabajas en otro equipo, clona primero `https://github.com/JorgeZO/Examen1P-AguaFix-API.git` y entra a esa carpeta.

Si todavía no tienes `.env`, créalo con `cp .env.example .env`. Complétalo en tu editor, fuera de la grabación:

| Variables | Qué poner |
|---|---|
| `PORT`, `HOST` | Conserva `3000` y `127.0.0.1`; Compose configura la escucha interna del contenedor |
| `DB_USERNAME`, `DB_PASSWORD` | Un usuario para tu base y una contraseña propia; Compose los usa para inicializar PostgreSQL |
| `DB_DATABASE` | Conserva `water_reports` o elige un nombre para esta base |
| `DB_HOST`, `DB_PORT` | Conserva `127.0.0.1` y `5432`; Compose los sustituye internamente por `postgres` y `5432` |
| `AWS_REGION`, `AWS_S3_BUCKET` | Región y nombre exactos de tu bucket |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credenciales de la identidad IAM con permiso de subida |
| `AWS_SESSION_TOKEN` | Solo si las credenciales AWS son temporales; en otro caso déjalo vacío |
| `DOCKER_USER` | El mismo usuario configurado en el Secret de GitHub; el token de Docker no se necesita aquí |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Los datos de tu proveedor SMTP real |
| `SMTP_USER`, `SMTP_PASSWORD` | Usuario y credencial SMTP de ese proveedor |
| `SMTP_FROM` | Un remitente autorizado por tu proveedor |
| `MAINTENANCE_EMAIL` | Un buzón al que puedas entrar para mostrar el correo recibido; puede ser tu propio buzón |

Si usas Gmail y tu cuenta permite contraseñas de aplicación: activa la verificación en dos pasos, crea una contraseña de aplicación y úsala en `SMTP_PASSWORD`. Configura `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`; `SMTP_USER` y `SMTP_FROM` deben corresponder a tu correo. No uses tu contraseña normal. Algunas cuentas de escuela o trabajo no ofrecen esa opción. [Ayuda de Google](https://support.google.com/accounts/answer/185833?hl=es), [servidores y puertos SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp).

No uses los valores de Mailpit (`127.0.0.1:1025`) para el correo externo de la evidencia. Dentro de un contenedor, `127.0.0.1` apunta al propio contenedor.

## 4. Levantar la imagen publicada y ensayar

Con Docker Desktop iniciado y el workflow ya en verde:

```bash
docker compose pull
docker compose up -d
docker compose ps -a
curl -i http://127.0.0.1:3000/reports
```

La API debe responder `200`. El contenedor `migrate` puede aparecer como `Exited (0)`: significa que terminó correctamente; `api` debe permanecer en ejecución y PostgreSQL debe estar saludable. Las migraciones se aplican automáticamente. Si el arranque está tardando, espera unos segundos y repite la consulta.

Para ver el motivo de un fallo:

```bash
docker compose logs --tail 80 migrate api
```

Importa en Postman `postman/AguaFix.postman_collection.json`. `baseUrl` ya apunta a `http://127.0.0.1:3000`.

En **Crear reporte con foto**, usa Body → form-data:

| Campo | Tipo | Ejemplo |
|---|---|---|
| `address` | Text | Av. Reforma 120 |
| `description` | Text | Sale agua de la banqueta |
| `severity` | Text | high |
| `reporterPhone` | Text | 5551234567 |
| `photo` | File | Una foto local de la fuga |

Selecciona una imagen JPEG, PNG o WebP de hasta 5 MiB. Si el teléfono guarda HEIC, exporta una copia a JPEG. Deja que Postman genere el encabezado `Content-Type` y su boundary.

Ensaya lo siguiente antes de grabar:

1. **Crear reporte con foto**: respuesta `201`, `photoUrl` con `reports/`, `isResolved=false` y `repairPhotoUrl=null`. La colección guarda el ID en `reportId` automáticamente.
2. Abre `photoUrl` en una ventana privada: debe mostrar la imagen sin iniciar sesión en AWS.
3. Busca el mismo nombre de objeto en tu bucket, dentro de `reports/`.
4. Comprueba que `MAINTENANCE_EMAIL` recibió el correo y que la foto se ve. Revisa spam y permite imágenes externas si el lector las bloquea.
5. **Cerrar reporte con foto**: selecciona la foto del trabajo terminado en su campo `photo`. Espera `200`, `isResolved=true` y `repairPhotoUrl` con `repairs/`.
6. **Consultar reportes**: localiza ese ID y verifica las dos URL.
7. **Sin foto devuelve 400**: espera `400`; no debe crearse otro reporte.
8. Comprueba también **Registrar usuario** y **Login**. Registro devuelve `201` y login `200`; si el usuario de ensayo ya existe, usa otro correo ficticio para el registro.

Para ejecutar las pruebas automáticas con una base local expuesta al host, puedes usar el Compose de desarrollo. Si el puerto 5432 ya está ocupado, configura `DB_PORT=5433` en `.env` antes de iniciarlo:

```bash
docker compose -p aguafix-pruebas -f compose.dev.yaml up -d --wait postgres
npm test
docker compose -p aguafix-pruebas -f compose.dev.yaml down
```

Las pruebas usan una base temporal que eliminan al terminar y servidores S3/SMTP locales; no sustituyen los pasos con servicios reales de arriba. El Compose de desarrollo usa un proyecto diferente para aislar su base de los datos de la demostración. No hace falta ejecutarlo durante la grabación.

## 5. Grabar en el orden del examen

En tu Mac puedes iniciar la grabación con `⌘ + Shift + 5`. Antes de grabar deja listas las pestañas del editor, terminal, GitHub Actions, Docker Hub, Postman, bucket S3 y correo. Mantén `.env`, claves y tokens fuera de pantalla.

| Orden | Qué mostrar | Qué debe verse |
|---|---|---|
| a | Cambio de código, commit y push a main | Un cambio real guardado, el commit y el push exitoso |
| b | GitHub Actions | La ejecución del mismo commit, primero en curso y después en verde |
| c | Docker Hub | El repositorio `aguafix-api`, tag `latest` y fecha de publicación actualizada |
| d | POST con foto → objeto S3 → correo | Form-data con archivo, respuesta `201`, objeto correspondiente en `reports/` y correo con foto visible |
| Después | Cierre y GET | PATCH con foto del trabajo, `repairPhotoUrl`, `isResolved=true` y GET con ambas URL |

Para el punto a, estando en `main`, cambia por ejemplo el asunto del correo en `src/reports/reports.controller.ts` a `AguaFix: nuevo reporte de fuga`. Luego muestra:

```bash
npm run build
git add src/reports/reports.controller.ts
git commit -m "Ajusta asunto del aviso de AguaFix"
git push origin main
```

No necesitas ejecutar `npm test` durante esa toma: requiere una base de pruebas accesible desde el host, mientras que el PostgreSQL del Compose de entrega está dentro de la red de contenedores.

Para b, entra a [Actions](https://github.com/JorgeZO/Examen1P-AguaFix-API/actions), abre la ejecución de ese commit y espera a que termine en verde. No uses una ejecución vieja como evidencia del cambio nuevo.

Para c, abre `https://hub.docker.com/r/TU_USUARIO/aguafix-api/tags`, sustituyendo `TU_USUARIO` por tu usuario real. Tras mostrar la publicación, actualiza el contenedor antes del POST:

```bash
docker compose pull
docker compose up -d
```

Para d, crea un reporte nuevo durante la grabación y sigue la misma `photoUrl` desde la respuesta hasta S3 y el correo. Comprueba también el asunto nuevo para mostrar que utilizas la versión recién publicada. Después cierra ese mismo ID con la otra foto. Puedes añadir el rechazo sin foto y registro/login para reforzar la demostración del primer parcial.

## 6. Qué subir como entrega

Entrega estos tres elementos en la plataforma de tu clase:

1. **Repositorio:** https://github.com/JorgeZO/Examen1P-AguaFix-API, con los cambios integrados en `main`.
2. **Imagen:** `https://hub.docker.com/r/TU_USUARIO/aguafix-api`, sustituyendo el usuario; el repositorio debe ser público y contener `latest` publicado.
3. **Video:** el archivo grabado, o su enlace si la plataforma lo permite. Si lo subes a Drive u otro servicio, concede acceso a tu profesor y comprueba que el enlace se pueda abrir con esos permisos.

Si además te solicitan capturas, toma las mismas vistas del video: commit/push, Actions verde, fecha de Docker Hub, POST `201`, objeto S3, correo con foto y cierre/GET. Las capturas complementan el video; el enunciado pide video.

## Si aparece un error

| Síntoma | Qué revisar |
|---|---|
| Actions: `Username and password required` | Faltan Secrets, están en otro repositorio o sus nombres no coinciden |
| Actions: `unauthorized` / `denied` | Usuario de Docker Hub, token vigente, permisos de escritura y repositorio `aguafix-api` |
| Compose: `pull access denied` | La imagen todavía no existe, es privada o `DOCKER_USER` no coincide |
| Compose: `variable is not set` | Falta completar la variable indicada en `.env` |
| API no responde | Revisa `docker compose ps -a` y los logs de `migrate` y `api` |
| POST devuelve `400` | Los cuatro textos, el nombre `photo`, el archivo seleccionado y la severidad válida |
| POST devuelve `413` | La foto supera 5 MiB |
| S3: `AccessDenied` al subir | Política IAM de subida, nombre/región del bucket y credenciales |
| La URL da `403` pero la subida funciona | Política de lectura pública y bloqueo público a nivel bucket/cuenta/organización |
| SMTP: `535` / autenticación fallida | Credencial del proveedor; en Gmail, contraseña de aplicación si la cuenta la permite |
| SMTP falla y POST devuelve `500` | El reporte ya puede haberse guardado: consulta GET antes de reenviarlo |
| Cierre devuelve `400` | Falta foto, es inválida o el reporte ya estaba cerrado; crea uno nuevo para la toma |
| Cierre devuelve `404` | `reportId` no corresponde a un reporte de esta base |

No ejecutes `docker compose down -v` sobre la demostración si quieres conservar sus reportes: esa opción elimina el volumen de PostgreSQL.
