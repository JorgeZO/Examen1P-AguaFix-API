import { Body, Controller, Get, Post } from '@nestjs/common';
import { envs } from '../config/envs';
import { EmailService } from '../email/email.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';
import { generateReportTemplate } from './templates/report.template';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  async create(@Body() dto: CreateReportDto) {
    // Primero se guarda el reporte en PostgreSQL.
    const report = await this.reportsService.create(dto);

    // Después se envía el correo a la cuadrilla.
    const template = generateReportTemplate(dto);
    await this.emailService.sendEmail(
      envs.maintenanceEmail,
      'Nuevo reporte de fuga de agua',
      template,
    );

    return report;
  }

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }
}
