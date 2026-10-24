# AguaFix: fotos en S3 y publicación en Docker Hub

API del mismo repositorio del primer parcial, con NestJS 11, PostgreSQL y TypeORM. Conserva registro, login, bcrypt, validación y correo. Agrega fotos obligatorias al crear y cerrar reportes.

## Preparar el entorno

Requisitos: Node.js 22, npm y PostgreSQL 16; Docker Desktop para ejecutar contenedores.

```bash
npm ci
cp .env.example .env
```

Complete `.env` con los datos de su base, correo y bucket. `DB_USERNAME`, `DB_PASSWORD`, `AWS_REGION` y `AWS_S3_BUCKET` se dejan vacíos deliberadamente. Las credenciales AWS se cargan mediante `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y, si corresponde, `AWS_SESSION_TOKEN`; también se puede usar un rol IAM sin esas variables. Nunca agregue `.env` a Git.

Para desarrollo con PostgreSQL y Mailpit en Docker:

```bash
docker compose -f compose.dev.yaml up -d --wait
npm run migration:run
npm run start:dev
```

Use `DB_HOST=127.0.0.1`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false` y deje vacíos `SMTP_USER` y `SMTP_PASSWORD` para Mailpit. Su buzón está en http://127.0.0.1:8025. Si ya tiene PostgreSQL y SMTP, omita Compose y use sus datos. Para recibir el correo en una cuenta externa, configure un proveedor SMTP real y `MAINTENANCE_EMAIL`.

## Endpoints

| Método | Ruta | Entrada | Resultado |
|---|---|---|---|
| POST | `/auth/register` | JSON de CreateUserDto | 201, usuario sin contraseña |
| POST | `/auth/login` | JSON de LoginDto | 200; credenciales incorrectas: 400 |
| POST | `/reports` | multipart: address, description, severity, reporterPhone, photo | 201, foto en `reports/`, reporte guardado y correo enviado |
| GET | `/reports` | Sin body | 200, reportes con photoUrl y repairPhotoUrl |
| PATCH | `/reports/:id/resolve` | multipart: photo | 200, foto en `repairs/`, repairPhotoUrl e isResolved=true |

`severity` acepta `low`, `medium` y `high`. En los dos endpoints de fotos, el campo se llama **photo** y es obligatorio. Se aceptan JPEG, PNG y WebP de hasta 5 MiB. Se comprueba la firma del archivo; el tipo y la extensión almacenados corresponden al contenido. Archivo ausente o inválido: 400. Archivo demasiado grande: 413. Cierre de reporte inexistente: 404; cierre repetido: 400.

En Postman importe `postman/AguaFix.postman_collection.json`. En Body → form-data seleccione una imagen local en el campo `photo`, de tipo File. Deje que Postman genere el Content-Type y su boundary. La petición de creación guarda automáticamente `reportId` para el cierre. No escriba `photoUrl`, `repairPhotoUrl` ni `isResolved` en el body.

```bash
curl -i http://127.0.0.1:3000/reports \
  -F 'address=Av. Reforma 120' \
  -F 'description=Sale agua de la banqueta' \
  -F 'severity=high' \
  -F 'reporterPhone=5551234567' \
  -F 'photo=@/ruta/a/fuga.jpg'

curl http://127.0.0.1:3000/reports

# Reemplace 1 por el ID devuelto al crear el reporte.
curl -i -X PATCH http://127.0.0.1:3000/reports/1/resolve \
  -F 'photo=@/ruta/a/reparacion.jpg'
```

## S3 y correo con foto

`StorageModule` exporta `StorageService`. `uploadFile(file, folder): Promise<string>` utiliza `@aws-sdk/client-s3`, nombres UUID y `PutObjectCommand`; regresa la URL pública HTTPS del objeto. Las credenciales se resuelven con la cadena estándar del SDK. No se envían ACL en la subida.

1. Cree un bucket S3 y anote su nombre y región en `.env`.
2. Conceda a la identidad de la API `s3:PutObject` únicamente sobre `reports/*` y `repairs/*`. El ejemplo está en `docs/s3-upload-policy.json`; reemplace `NOMBRE_DEL_BUCKET`.
3. Para que la URL sea pública y el correo pueda mostrarla, aplique `docs/s3-public-read-policy.json`, sustituyendo el mismo nombre. Permite únicamente `s3:GetObject` anónimo sobre esos dos prefijos. La configuración de bloqueo público del bucket y de la cuenta debe permitir esa política. No habilite escritura pública ni listado público.
4. Abra una URL devuelta en una ventana sin sesión de AWS para comprobar su lectura. Un `AccessDenied` indica que la política o el bloqueo público aún impiden verla.

`generateReportTemplate(dto, photoUrl)` incluye dirección, descripción, severidad, teléfono y `<img src="...">`, con datos escapados. Algunos lectores de correo requieren habilitar imágenes externas.

## Migración sin perder el primer parcial

`synchronize: false` continúa en `src/database/data-source.ts`. La migración inicial permanece intacta. `1792022400000-AddReportPhotos` agrega `photoUrl` y `repairPhotoUrl` a `WATER_REPORT`.

Las columnas aceptan `null` para conservar reportes históricos que no tenían foto. Todo reporte nuevo creado por la API exige `photo`; `repairPhotoUrl` permanece en `null` hasta cerrarlo con una imagen.

```bash
npm run migration:run
# Revertir la última migración elimina las columnas de fotos y sus URL:
npm run migration:revert
```

Se mantiene la secuencia guardar → enviar correo → responder. Si SMTP falla, se responde 500 y el reporte con su foto permanece guardado, como antes. Si falla S3, no se crea ni se cierra el reporte. No hay transacción distribuida entre S3 y PostgreSQL: si falla la base después de subir, el objeto puede quedar sin reporte asociado.

## Docker y GitHub Actions

Cree un repositorio **público** llamado `aguafix-api` en Docker Hub. En GitHub → Settings → Secrets and variables → Actions agregue:

- `DOCKER_USER`: su usuario de Docker Hub.
- `DOCKER_PASSWORD`: un token de Docker Hub con permiso de escritura.

El workflow `.github/workflows/docker-publish.yaml` se ejecuta con cada push a `main` y admite ejecución manual. Inicia sesión con esos Secrets, construye para Linux AMD64 y ARM64 y publica `DOCKER_USER/aguafix-api:latest`. AWS, SMTP y la base de datos solo se configuran al ejecutar la API; no se usan durante la construcción.

El Dockerfile usa `node:22-alpine`, compila TypeScript y ejecuta `node dist/main` como usuario `node`. Las etapas de compilación y dependencias usan `BUILDPLATFORM`: preparan el JavaScript en la arquitectura del constructor y lo copian a las imágenes finales AMD64/ARM64. Las dependencias actuales no incluyen módulos binarios nativos; la construcción no necesita QEMU. Copia únicamente dependencias, `dist` y `package.json` a la etapa final. `.dockerignore` excluye `.env`, todos los Compose, `node_modules`, `dist` y `.git`.

Cuando el workflow termine en verde, complete `DOCKER_USER` en `.env`. Para ejecutar la imagen publicada:

```bash
docker compose pull
docker compose up -d
```

`compose.yaml` descarga la imagen desde Docker Hub, inicia PostgreSQL, aplica las migraciones con un contenedor temporal y arranca la API en http://127.0.0.1:3000. No construye una imagen local. Use el hostname de su proveedor SMTP: `127.0.0.1` dentro del contenedor apunta al propio contenedor. Las variables del archivo `.env` se inyectan al ejecutar; el archivo no se copia a la imagen.

## Comprobación y entrega

```bash
npm test
```

Las pruebas requieren una instancia PostgreSQL accesible y un usuario que pueda crear bases. Usan `DB_*` si se configuraron; en una instalación local también pueden usar el usuario del sistema. Crean y eliminan una base temporal. SMTP y S3 usan servidores HTTP/SMTP locales de prueba: se ejecuta el SDK S3 real, sin acceder a una cuenta AWS ni entregar correo externo.

La validación realizada está en `docs/VALIDACION.md`. La guía completa de configuración, ensayo, grabación y entrega está en [`docs/PRUEBAS_Y_EVIDENCIA.md`](docs/PRUEBAS_Y_EVIDENCIA.md); `docs/VIDEO.md` resume la toma. La colección Postman incluye las peticiones necesarias.

Se fija Multer 2.5.0 mediante `overrides` porque NestJS 11 fija una versión anterior; este ajuste incorpora la corrección de seguridad de cargas multipart. La compilación y las pruebas de subida se verificaron con esa versión.

- Repositorio: https://github.com/JorgeZO/Examen1P-AguaFix-API
- Imagen pública: [jorgezo/aguafix-api](https://hub.docker.com/r/jorgezo/aguafix-api), tag `latest`.
- Publicación inicial verificada: [GitHub Actions en verde](https://github.com/JorgeZO/Examen1P-AguaFix-API/actions/runs/40129536399).

El 24 de octubre de 2026 se configuraron los Secrets, se integró el PR #1 y GitHub Actions publicó `latest` para AMD64 y ARM64. Se descargó esa imagen desde Docker Hub y se verificó con Compose. La configuración de S3 y correo reales sigue pendiente; la prueba de integración utiliza receptores locales para esos dos servicios.
