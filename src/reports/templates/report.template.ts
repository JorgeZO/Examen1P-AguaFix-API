import { CreateReportDto } from '../dto/create-report.dto';

// Evita que los datos del ciudadano se interpreten como etiquetas HTML.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function generateReportTemplate(dto: CreateReportDto, photoUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de fuga de agua</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; color: #163047;">
  <h1 style="font-size: 24px;">Nuevo reporte de fuga de agua</h1>
  <p>Cuadrilla de mantenimiento: se recibió el siguiente reporte.</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <th scope="row" style="text-align: left; padding: 12px; border: 1px solid #ccc;">Dirección</th>
      <td style="padding: 12px; border: 1px solid #ccc;">${escapeHtml(dto.address)}</td>
    </tr>
    <tr>
      <th scope="row" style="text-align: left; padding: 12px; border: 1px solid #ccc;">Descripción</th>
      <td style="padding: 12px; border: 1px solid #ccc;">${escapeHtml(dto.description)}</td>
    </tr>
    <tr>
      <th scope="row" style="text-align: left; padding: 12px; border: 1px solid #ccc;">Severidad</th>
      <td style="padding: 12px; border: 1px solid #ccc;">${escapeHtml(dto.severity)}</td>
    </tr>
    <tr>
      <th scope="row" style="text-align: left; padding: 12px; border: 1px solid #ccc;">Teléfono de contacto</th>
      <td style="padding: 12px; border: 1px solid #ccc;">${escapeHtml(dto.reporterPhone)}</td>
    </tr>
  </table>
  <h2 style="font-size: 18px;">Foto de la fuga</h2>
  <img src="${escapeHtml(photoUrl)}" alt="Fotografía de la fuga reportada"
    width="600" style="display: block; max-width: 100%; height: auto; border-radius: 8px;">
</body>
</html>`;
}
