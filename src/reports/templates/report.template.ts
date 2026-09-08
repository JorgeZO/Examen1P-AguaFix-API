import { CreateReportDto } from '../dto/create-report.dto';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

export function generateReportTemplate(dto: CreateReportDto): string {
  const rows = [
    ['Dirección o referencia', dto.address], ['Descripción', dto.description],
    ['Severidad', dto.severity], ['Teléfono de contacto', dto.reporterPhone],
  ].map(([label, value]) => `<tr>
    <th scope="row" style="padding:14px;text-align:left;vertical-align:top;border-bottom:1px solid #dce5ec;width:35%">${label}</th>
    <td style="padding:14px;border-bottom:1px solid #dce5ec;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(value)}</td>
  </tr>`).join('');
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reporte de fuga de agua</title></head>
<body style="margin:0;padding:24px;background:#edf3f8;color:#163047;font-family:Arial,sans-serif">
  <table role="presentation" style="width:100%;max-width:640px;margin:auto;background:#ffffff;border-collapse:collapse">
    <tr><td style="padding:24px;background:#075985;color:#ffffff"><h1 style="margin:0;font-size:24px">Nuevo reporte de fuga de agua</h1></td></tr>
    <tr><td style="padding:24px"><p>Cuadrilla de mantenimiento: se recibió un reporte ciudadano con los siguientes datos.</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <p style="margin-top:24px">Por favor, revisen la ubicación y programen la atención de la fuga.</p>
    </td></tr>
  </table>
</body></html>`;
}
