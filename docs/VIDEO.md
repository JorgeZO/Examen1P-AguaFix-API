# Guía para su grabación

El video lo graba el alumno. Esta guía indica la secuencia del enunciado; no es evidencia de una publicación ya realizada.

## Antes de grabar

1. Integre los cambios en `main` y configure `DOCKER_USER` y `DOCKER_PASSWORD` en GitHub Secrets.
2. Cree el repositorio público `aguafix-api` en Docker Hub.
3. Complete su `.env` local con S3, PostgreSQL y un SMTP real; compruebe que las URL del bucket se puedan abrir sin sesión AWS.
4. Importe `postman/AguaFix.postman_collection.json` y tenga una foto de fuga y otra de reparación disponibles.
5. Cuando exista la imagen publicada, ejecute `docker compose pull` y `docker compose up -d`.

## Grabar en este orden

### a. Cambio, commit y push a main

En `main`, haga un cambio visible, por ejemplo modificar el asunto del correo en `src/reports/reports.controller.ts`. Muestre el cambio y ejecute:

```bash
npm test
git add src/reports/reports.controller.ts
git commit -m "Ajusta asunto del aviso a la cuadrilla"
git push origin main
```

Evite `git add .` si tiene archivos propios que no quiere publicar. `.env` ya está ignorado.

### b. GitHub Actions

Abra https://github.com/JorgeZO/Examen1P-AguaFix-API/actions y entre a la ejecución de su commit. Muestre el workflow ejecutándose y espere a que termine en verde, incluyendo el paso de publicación. No muestre valores de Secrets.

### c. Docker Hub

Abra `https://hub.docker.com/r/<su-usuario>/aguafix-api/tags`. Muestre `latest` y la fecha de publicación actualizada. Después ejecute `docker compose pull` y `docker compose up -d` para usar esa versión.

### d. Postman → S3 → correo

1. Ejecute **Crear reporte con foto** en Postman. Muestre los cuatro campos de texto y `photo` como File, la respuesta 201, el ID y `photoUrl`.
2. En la consola S3 abra el bucket y el prefijo `reports/`; muestre el objeto correspondiente a esa URL.
3. Abra el buzón real de `MAINTENANCE_EMAIL`. Muestre dirección, descripción, severidad, teléfono y la foto visible; habilite imágenes externas si el lector lo solicita.

Para demostrar también el cierre: envíe **Cerrar reporte con foto**, muestre `isResolved=true`, `repairPhotoUrl`, el objeto en `repairs/` y GET con ambas URL. Puede mostrar el POST sin foto devolviendo 400 y registro/login para evidenciar que el primer parcial sigue funcionando.
