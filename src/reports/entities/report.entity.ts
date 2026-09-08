import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum Severity { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }

@Entity('WATER_REPORT')
@Check('CHK_REPORT_SEVERITY', `"severity" IN ('low', 'medium', 'high')`)
export class Report {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_WATER_REPORT' }) id!: number;
  @Column({ type: 'varchar', length: 255 }) address!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'varchar', length: 6 }) severity!: Severity;
  @Column({ type: 'varchar', length: 25 }) reporterPhone!: string;
  @Column({ default: false }) isResolved!: boolean;
  @CreateDateColumn({ type: 'timestamp' }) createdAt!: Date;
}
