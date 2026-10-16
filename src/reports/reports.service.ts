import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateReportDto, photo: Express.Multer.File) {
    const photoUrl = await this.storageService.uploadFile(photo, 'reports/');
    return this.reportsRepository.create(dto, photoUrl);
  }

  findAll() {
    return this.reportsRepository.findAll();
  }

  async resolve(id: number, photo: Express.Multer.File) {
    const report = await this.reportsRepository.findById(id);
    if (!report) throw new NotFoundException('Reporte no encontrado');
    if (report.isResolved) throw new BadRequestException('El reporte ya está cerrado');

    const repairPhotoUrl = await this.storageService.uploadFile(photo, 'repairs/');
    return this.reportsRepository.resolve(report, repairPhotoUrl);
  }
}
