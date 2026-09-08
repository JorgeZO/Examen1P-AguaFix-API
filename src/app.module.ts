import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { databaseOptions } from './database/data-source';
import { ReportsModule } from './reports/reports.module';

@Module({ imports: [TypeOrmModule.forRoot(databaseOptions), AuthModule, ReportsModule] })
export class AppModule {}
