# Revisión contra el enunciado

## Requisitos

| Requisito | Dónde se cumple | Comprobación |
|---|---|---|
| NestJS 11 y TypeScript | `package.json` y archivos `src/*.ts` | Compilación correcta; NestJS 11.2.3 instalado |
| PostgreSQL y TypeORM | `src/database/data-source.ts` | Pruebas contra PostgreSQL 16.15 real |
| Migraciones y synchronize false | `src/database/migrations/` y DataSource | Aplicar, revertir, reaplicar y comparar esquema con entidades |
| dotenv + env-var | `src/config/envs.ts` | Inicio de la aplicación usando estas variables |
| Contraseñas bcryptjs | `src/auth/auth.service.ts` | Hash almacenado y comparación de contraseña |
| Nodemailer | `src/email/email.service.ts` | Correo recibido por un servidor SMTP local |
| Módulo, controller, service, repository | `src/auth/`, `src/users/`, `src/reports/` | Revisión del recorrido de cada endpoint |
| DTOs | `CreateUserDto`, `LoginDto`, `CreateReportDto` | Entradas correctas aceptadas; inválidas rechazadas |
| WATER_REPORT con sus siete campos | `report.entity.ts` y migración | ID serial, tipos, defaults y persistencia verificados |
| SYSTEM_USER con sus cinco campos | `user.entity.ts` y migración | Registro, hash y booleano verificados |
| POST /reports y GET /reports | `reports.controller.ts` | Creación con correo y consulta de todos los reportes |
| POST /auth/register y POST /auth/login | `auth.controller.ts` | Registro, acceso válido e inválido |
| BadRequestException en login inválido | `auth.service.ts` | HTTP 400: «Correo o contraseña incorrectos» |
| sendEmail(to, subject, template) | `email.service.ts` | Destinatario, asunto y cuerpo enviados por SMTP |
| generateReportTemplate(dto): string | `reports/templates/report.template.ts` | Tabla HTML con dirección, descripción, severidad y teléfono |
| Guardar y enviar correo desde el controller | `ReportsController.create()` | Primero persiste, después espera el envío |
| Git y video | Historial `.git` y MP4 adjunto | Video de la versión simplificada |

GET no recibe body ni parámetros; no se añade un DTO vacío. La aplicación tiene exactamente los cuatro endpoints pedidos. Los archivos de pruebas, Compose y la documentación sirven para ejecutarla y verificarla.

## Resultado

14 escenarios de integración aprobados, cero fallos. Node informa 15 pruebas al contar también el grupo principal. Incluyen las tres severidades, los datos inválidos, el listado, las credenciales incorrectas, el hash, el correo y el comportamiento cuando SMTP falla.

Se quitaron el objeto adicional `notification`, las expresiones regulares de teléfono, la longitud mínima de contraseña, la normalización automática de entradas, el orden especial del listado, QueryBuilder, la generación de filas HTML con map y la configuración avanzada del transporter. Los pasos principales están escritos de forma explícita.

Se conservan la validación de tipos, el límite técnico de bcrypt, la exclusión de contraseñas en respuestas y el escape de HTML. Son comprobaciones del manejo de los datos, no endpoints o funciones adicionales.

La prueba de correo usa un receptor SMTP local y no demuestra entrega a una cuenta externa. Docker Compose se incluye como ayuda de arranque; se verificó PostgreSQL instalado localmente. No se publicó en GitHub ni en la nube.
