import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { envs } from '../config/envs';
import { EmailService } from '../email/email.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';
import { generateReportTemplate } from './templates/report.template';

@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);
  constructor(private readonly reportsService: ReportsService, private readonly emailService: EmailService) {}

  @Post()
  async create(@Body() dto: CreateReportDto) {
    const report = await this.reportsService.create(dto);
    try {
      await this.emailService.sendEmail(envs.maintenanceEmail,
        `Nueva fuga de agua #${report.id} - ${report.severity}`, generateReportTemplate(dto));
      return { report, notification: { sent: true } };
    } catch {
      this.logger.error(`Reporte ${report.id} guardado; falló la notificación SMTP`);
      return { report, notification: { sent: false,
        message: 'El reporte se guardó, pero no se pudo enviar el correo. No vuelva a crear el reporte.' } };
    }
  }
  @Get()
  findAll() { return this.reportsService.findAll(); }
}
