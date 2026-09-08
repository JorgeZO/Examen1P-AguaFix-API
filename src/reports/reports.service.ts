import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  create(dto: CreateReportDto) {
    return this.reportsRepository.create(dto);
  }

  findAll() {
    return this.reportsRepository.findAll();
  }
}
