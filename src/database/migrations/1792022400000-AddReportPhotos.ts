import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportPhotos1792022400000 implements MigrationInterface {
  name = 'AddReportPhotos1792022400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "WATER_REPORT" ADD "photoUrl" text, ADD "repairPhotoUrl" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "WATER_REPORT" DROP COLUMN "repairPhotoUrl", DROP COLUMN "photoUrl"');
  }
}
