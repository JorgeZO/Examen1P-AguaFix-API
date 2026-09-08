# Demostración de la API

El video actualizado `demostracion-api.mp4` que acompaña al repositorio muestra ejecución real de NestJS 11 con PostgreSQL local y un receptor SMTP de prueba. No utiliza respuestas simuladas. Es una demostración visual con rótulos en español, sin narración de voz.

Secuencia:

1. Arquitectura y migración aplicada con `synchronize: false`.
2. Registro de un usuario ficticio: 201 y respuesta sin contraseña.
3. Login correcto: 200.
4. Contraseña incorrecta: 400 y mensaje claro.
5. Creación de fuga: 201, ID, fecha, `isResolved=false`.
6. Listado: GET 200 con el reporte persistido.
7. Correo recibido por el receptor SMTP: destinatario, asunto y HTML con los cuatro datos.
8. Consulta SQL directa: reporte guardado y contraseña bcrypt en `SYSTEM_USER`.
9. Severidad inválida: 400; no se crea un nuevo reporte.

La pantalla utilizada para grabar es un visor de demostración; no forma parte de los endpoints de producción. El receptor SMTP captura el mensaje enviado por Nodemailer sin entregarlo externamente. Para repetir manualmente la demostración, levante el proyecto siguiendo README, ejecute `requests.http` y abra Mailpit en localhost:8025.
