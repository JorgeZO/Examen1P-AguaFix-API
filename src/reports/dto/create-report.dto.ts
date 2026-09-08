import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Severity } from '../entities/report.entity';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateReportDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(255)
  address!: string;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(5000)
  description!: string;

  @IsEnum(Severity, { message: 'severity debe ser low, medium o high' })
  severity!: Severity;

  @Transform(trim) @IsString() @MaxLength(25)
  @Matches(/^\+?[0-9 ()-]{7,25}$/, { message: 'reporterPhone debe ser un teléfono válido' })
  @Matches(/^(?:\D*\d){7,15}\D*$/, { message: 'reporterPhone debe contener de 7 a 15 dígitos' })
  reporterPhone!: string;
}
