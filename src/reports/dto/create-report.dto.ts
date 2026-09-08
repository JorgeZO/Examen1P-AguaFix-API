import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(['low', 'medium', 'high'], {
    message: 'severity debe ser low, medium o high',
  })
  severity!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  reporterPhone!: string;
}
