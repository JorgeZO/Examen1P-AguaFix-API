# API municipal de fugas de agua

Proyecto de primer parcial: NestJS **11**, TypeScript, PostgreSQL, TypeORM con migraciones, `env-var` + `dotenv`, `bcryptjs` y Nodemailer.

## Ejecutar

Requisitos: Node.js 20 o superior, npm y Docker con Compose. También puede usarse una instalación local de PostgreSQL y un servidor SMTP.

```bash
npm ci
cp .env.example .env
docker compose up -d --wait
npm run migration:run
npm run build
npm start
```

API: `http://127.0.0.1:3000`. Buzón de prueba Mailpit: `http://127.0.0.1:8025`. Los correos de Mailpit se capturan localmente; no se entregan a personas reales. Para desarrollo: `npm run start:dev`.

Si usa PostgreSQL instalado localmente, cree una base y configure `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB_DATABASE` en `.env`; omita Compose si también dispone de SMTP. Todas las variables se leen y validan en `src/config/envs.ts`. El servidor escucha en localhost; para un contenedor o despliegue, configure `HOST=0.0.0.0`.

Para correo real, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `MAINTENANCE_EMAIL`. Normalmente se usa `SMTP_SECURE=true` en 465 o `false` en 587 con STARTTLS. Las credenciales no se versionan.

## Endpoints

| Método y ruta | Entrada | Resultado |
|---|---|---|
| `POST /auth/register` | `CreateUserDto`: name, email, password, isNotificationEnabled opcional | 201: usuario sin contraseña |
| `POST /auth/login` | `LoginDto`: email, password | 200: mensaje y usuario sin contraseña; 400: credenciales inválidas |
| `POST /reports` | `CreateReportDto`: address, description, severity, reporterPhone | 201: reporte persistido y estado del correo |
| `GET /reports` | Sin body ni parámetros | 200: lista de reportes, más recientes primero |

`requests.http` contiene peticiones listas para REST Client o para trasladar a Postman/Bruno. Ejemplo:

```bash
curl -i http://127.0.0.1:3000/reports \
  -H 'Content-Type: application/json' \
  -d '{"address":"Av. Reforma 120, frente al parque","description":"Sale agua de la banqueta.","severity":"high","reporterPhone":"5551234567"}'

curl http://127.0.0.1:3000/reports
```

Respuesta de creación (ejemplo ilustrativo):

```json
{
  "report": {
    "id": 1,
    "address": "Av. Reforma 120, frente al parque",
    "description": "Sale agua de la banqueta.",
    "severity": "high",
    "reporterPhone": "5551234567",
    "isResolved": false,
    "createdAt": "2026-09-08T02:00:00.000Z"
  },
  "notification": { "sent": true }
}
```

El controller espera a que se guarde el reporte y después llama a `EmailService.sendEmail(to, subject, template)` con el HTML generado por `generateReportTemplate(dto)`. La plantilla contiene dirección, descripción, severidad y teléfono; escapa los datos ciudadanos para impedir inyección de HTML.

Si SMTP falla, la API conserva el reporte, responde 201 con `notification.sent=false` y un mensaje explícito, y registra el ID para seguimiento. `sent=true` significa que SMTP aceptó el correo, no una garantía de lectura o entrega final. No hay reintento automático; no debe repetirse el POST para reenviar un aviso.

## Arquitectura

```text
src/
  config/       envs.ts y ValidationPipe compartido
  database/     DataSource y migración inicial reversible
  auth/         módulo → controller → service → UsersService
  users/        módulo → service → repository → entidad User
  reports/      módulo → controller → service → repository → entidad Report
                dto/ y templates/report.template.ts
  email/        módulo y servicio Nodemailer
```

Los controllers no acceden directamente a TypeORM. Auth llega al repositorio a través del servicio de usuarios; Users no necesita controller porque los endpoints de usuario solicitados están en Auth. GET no tiene datos de entrada, por lo que no necesita un DTO vacío.

`WATER_REPORT` tiene ID serial, dirección, descripción, severidad restringida a `low | medium | high`, teléfono, `isResolved=false` y `createdAt` tipo timestamp generado por PostgreSQL. `SYSTEM_USER` tiene ID serial, nombre, correo único, contraseña bcrypt y `isNotificationEnabled=true` por defecto. Los correos se normalizan a minúsculas antes de guardarse.

Las contraseñas se hashean con bcrypt y costo 12, nunca se devuelven en respuestas y requieren al menos 8 caracteres y como máximo 72 bytes UTF-8. Las credenciales incorrectas lanzan `BadRequestException('Correo o contraseña incorrectos')`. Correo repetido: 409. Datos inválidos, campos inesperados o campos de reporte administrados por el servidor: 400.

El alcance del examen incluye comprobar credenciales; este login no emite JWT ni crea una sesión. Los endpoints de reportes son públicos. `isNotificationEnabled` se almacena como preferencia del usuario; la notificación de mantenimiento se envía al destinatario institucional `MAINTENANCE_EMAIL`.

## Migraciones

`synchronize: false` y `migrationsRun: false` están definidos explícitamente. La base se prepara antes de arrancar la API.

```bash
npm run migration:run
# Generar una migración después de modificar entidades:
npm run migration:generate -- src/database/migrations/NombreCambio
# Revertir la última migración (la inicial elimina ambas tablas y sus datos):
npm run migration:revert
# Ejecutar migraciones desde JavaScript compilado:
npm run build
npm run migration:run:prod
```

Referencias: [migraciones TypeORM](https://typeorm.io/docs/migrations/why/) y [opciones del DataSource](https://typeorm.io/docs/data-source/data-source-options/).

## Pruebas de integración

```bash
npm test
```

Se necesita PostgreSQL disponible con los valores de `.env` y un usuario que pueda crear bases de datos. Las pruebas crean una base temporal independiente, ejecutan y revierten migraciones, levantan Nest y un receptor SMTP local en puertos libres, y eliminan la base temporal al terminar. No usan ni borran las tablas de `DB_DATABASE`, ni envían correo al destinatario configurado para producción.

Se comprueban registro, bcrypt, correo duplicado, login correcto e incorrecto, booleanos, límite de contraseña en bytes, persistencia, orden de listado, HTML escapado, destinatario del correo, DTOs, restricción SQL y fallo SMTP. También se comprueba que la migración y las entidades no tengan diferencias de esquema.

## Entregables

Se proporciona un repositorio Git local con el código y su historial, y un video MP4 separado con peticiones reales a esta API, consultas a PostgreSQL y el correo capturado por SMTP local. `docs/VIDEO.md` describe la demostración.

Para publicar el repositorio en una cuenta propia después de crear un repositorio remoto vacío:

```bash
git remote add origin https://github.com/TU_USUARIO/water-reports-api.git
git push -u origin main
```

No se incluye un remoto configurado. Las direcciones, nombres, teléfonos y contraseñas de demostración son datos ficticios.
