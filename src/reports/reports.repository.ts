import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReportDto } from './dto/create-report.dto';
import { Report } from './entities/report.entity';

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(Report) private readonly repository: Repository<Report>,
  ) {}

  create(dto: CreateReportDto, photoUrl: string): Promise<Report> {
    const report = this.repository.create({ ...dto, photoUrl, repairPhotoUrl: null });
    return this.repository.save(report);
  }

  findAll(): Promise<Report[]> {
    return this.repository.find();
  }

  findById(id: number): Promise<Report | null> {
    return this.repository.findOneBy({ id });
  }

  resolve(report: Report, repairPhotoUrl: string): Promise<Report> {
    report.repairPhotoUrl = repairPhotoUrl;
    report.isResolved = true;
    return this.repository.save(report);
  }
}
