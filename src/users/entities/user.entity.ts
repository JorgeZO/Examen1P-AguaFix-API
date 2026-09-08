import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('SYSTEM_USER')
@Unique('UQ_SYSTEM_USER_EMAIL', ['email'])
export class User {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_SYSTEM_USER' })
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 60 })
  password!: string;

  @Column({ default: true })
  isNotificationEnabled!: boolean;
}
