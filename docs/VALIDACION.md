# Verificación realizada

La aplicación compiló con TypeScript 5.9.3 y NestJS 11.2.3. Se ejecutó la suite `npm test` contra PostgreSQL 16.15 real y un receptor SMTP local; 12 escenarios aprobados, cero fallos (el runner de Node informa 13 pruebas al incluir el grupo principal).

Escenarios verificados:

1. Migración inicial: aplicar, revertir y volver a aplicar; ejecución posterior sin cambios pendientes; entidades y esquema SQL coinciden; `synchronize=false`.
2. Listado inicial vacío.
3. Registro con normalización del correo, bcrypt costo 12 y respuesta sin contraseña.
4. Rechazo de correo duplicado con HTTP 409.
5. Login válido con HTTP 200 y respuesta sin contraseña.
6. Contraseña incorrecta y usuario inexistente con HTTP 400 y mensaje claro.
7. Validación de datos de usuario, booleanos (incluido null) y límite de contraseña en bytes UTF-8.
8. Persistencia de `isNotificationEnabled=false` explícito.
9. Creación de reporte: persistencia, defaults, ID, timestamp y recepción SMTP con destinatario y HTML correctos.
10. Rechazo de datos inválidos y campos reservados sin persistencia ni correos adicionales.
11. Restricción SQL de severidad activa, incluso en una escritura directa a PostgreSQL.
12. Fallo SMTP: reporte conservado, aviso explícito en respuesta y listado ordenado.

Docker Compose se entrega como alternativa de arranque; esta verificación se ejecutó con PostgreSQL instalado localmente porque el daemon Docker no estaba activo. No se verificó entrega a un proveedor de correo externo ni se publicó la API en la nube.
