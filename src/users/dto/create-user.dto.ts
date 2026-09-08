import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(120)
  name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password!: string;

  @ValidateIf((_object, value) => value !== undefined) @IsBoolean()
  isNotificationEnabled?: boolean;
}
