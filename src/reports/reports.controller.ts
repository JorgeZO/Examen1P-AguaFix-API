import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { envs } from '../config/envs';
import { EmailService } from '../email/email.service';
import { PhotoInterceptor, photoValidationPipe } from '../storage/photo-upload';
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
  @UseInterceptors(PhotoInterceptor())
  async create(
    @Body() dto: CreateReportDto,
    @UploadedFile(photoValidationPipe()) photo: Express.Multer.File,
  ) {
    // Primero se sube la foto y se guarda el reporte en PostgreSQL.
    const report = await this.reportsService.create(dto, photo);

    // Después se envía el correo a la cuadrilla.
    const template = generateReportTemplate(dto, report.photoUrl!);
    await this.emailService.sendEmail(
      envs.maintenanceEmail,
      'AguaFix: nuevo reporte de fuga de agua',
      template,
    );

    return report;
  }

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }

  @Patch(':id/resolve')
  @UseInterceptors(PhotoInterceptor())
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(photoValidationPipe()) photo: Express.Multer.File,
  ) {
    return this.reportsService.resolve(id, photo);
  }
}
