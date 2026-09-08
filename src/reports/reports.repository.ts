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

  create(dto: CreateReportDto): Promise<Report> {
    const report = this.repository.create(dto);
    return this.repository.save(report);
  }

  findAll(): Promise<Report[]> {
    return this.repository.find();
  }
}
