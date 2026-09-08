# API de reportes de fugas de agua

Proyecto del primer parcial con los cuatro endpoints solicitados, NestJS 11, TypeScript y PostgreSQL.

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior, npm y Docker Desktop iniciado.

```bash
npm ci
cp .env.example .env
docker compose up -d --wait
npm run migration:run
npm run build
npm start
```

La API escucha en `http://127.0.0.1:3000`. El buzón de correos de prueba se abre en `http://127.0.0.1:8025`.

Compose solo prepara PostgreSQL y Mailpit, el receptor SMTP local. Si ya tiene PostgreSQL y SMTP, configure sus datos en `.env` y omita el comando de Compose. Para ejecutar TypeScript directamente: `npm run start:dev`.

Las variables de entorno se leen con `dotenv` y `env-var` en `src/config/envs.ts`. Para enviar correos externos, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `MAINTENANCE_EMAIL`. Para Mailpit, el usuario y la contraseña SMTP se dejan vacíos.

## Endpoints

| Método | Ruta | DTO de entrada | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `CreateUserDto` | 201: usuario sin contraseña |
| POST | `/auth/login` | `LoginDto` | 200: usuario sin contraseña; 400: credenciales incorrectas |
| POST | `/reports` | `CreateReportDto` | 201: reporte guardado, después de enviar el correo |
| GET | `/reports` | No recibe datos | 200: todos los reportes |

Las peticiones de ejemplo están en `requests.http`.

```bash
curl -i http://127.0.0.1:3000/reports \
  -H 'Content-Type: application/json' \
  -d '{"address":"Av. Reforma 120","description":"Sale agua de la banqueta.","severity":"high","reporterPhone":"5551234567"}'

curl http://127.0.0.1:3000/reports
```

El POST devuelve directamente los campos del reporte: `id`, `address`, `description`, `severity`, `reporterPhone`, `isResolved` y `createdAt`.

## Cómo está organizado

- **Module:** conecta las clases de cada módulo.
- **Controller:** recibe la petición y el DTO.
- **Service:** realiza la operación solicitada.
- **Repository:** consulta o guarda datos usando TypeORM.

En reportes, el recorrido es `ReportsController → ReportsService → ReportsRepository`. En autenticación es `AuthController → AuthService → UsersService → UsersRepository`.

`ReportsController.create()` tiene tres pasos: guardar el reporte, enviar el correo con la plantilla y devolver el reporte. `EmailService.sendEmail(to, subject, template)` usa Nodemailer. La plantilla `src/reports/templates/report.template.ts` es una tabla HTML con dirección, descripción, severidad y teléfono.

`AuthService.register()` hashea la contraseña con bcryptjs. `login()` busca al usuario y compara la contraseña; si no coincide, lanza `BadRequestException('Correo o contraseña incorrectos')`. Nunca se devuelve la contraseña. Se comprueba el límite técnico de 72 bytes de bcrypt para evitar que se recorte silenciosamente; no se impone una longitud mínima adicional.

Solo existen los cuatro endpoints del enunciado. El login comprueba credenciales y devuelve el usuario; no emite tokens. `isNotificationEnabled` se guarda en el usuario y vale `true` si se omite. El aviso se envía al correo institucional definido en `MAINTENANCE_EMAIL`.

Si falla SMTP, la petición devuelve error 500 y el reporte ya guardado permanece en la base de datos. No hay un estado extra de notificación ni un mecanismo de reintentos.

## Base de datos y migraciones

Las tablas son `WATER_REPORT` y `SYSTEM_USER`, con los campos indicados en el examen. `isResolved` inicia en `false`; `createdAt` se genera al guardar. La severidad acepta únicamente `low`, `medium` o `high`.

`synchronize: false` está configurado en `src/database/data-source.ts`. Las tablas se crean con migraciones:

```bash
npm run migration:run
# Revertir la última migración; la inicial elimina las dos tablas y sus datos:
npm run migration:revert
```

## Verificación y entrega

```bash
npm test
```

Las pruebas necesitan PostgreSQL con los datos de `.env` y un usuario con permiso para crear bases. Crean una base temporal independiente y un receptor SMTP local; ambos se cierran al terminar. No modifican las tablas de la base de la aplicación.

`docs/VALIDACION.md` relaciona cada requisito con su implementación y las verificaciones realizadas. El video `demostracion-api.mp4`, entregado junto al repositorio, muestra peticiones reales de esta versión y el correo recibido localmente, con datos ficticios.

El repositorio tiene historial Git local. Para publicarlo, cree un repositorio vacío en su cuenta y ejecute:

```bash
git remote add origin https://github.com/TU_USUARIO/water-reports-api.git
git push -u origin main
```
