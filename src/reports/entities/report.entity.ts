import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('WATER_REPORT')
@Check('CHK_REPORT_SEVERITY', `"severity" IN ('low', 'medium', 'high')`)
export class Report {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_WATER_REPORT' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 6 })
  severity!: string;

  @Column({ type: 'varchar', length: 25 })
  reporterPhone!: string;

  // Los reportes del primer parcial no tienen fotografía. Los nuevos la exigen.
  @Column({ type: 'text', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  repairPhotoUrl!: string | null;

  @Column({ default: false })
  isResolved!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
