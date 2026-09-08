import { BadRequestException, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}
  private publicUser(user: User) {
    return { id: user.id, name: user.name, email: user.email, isNotificationEnabled: user.isNotificationEnabled };
  }
  async register(dto: CreateUserDto) {
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException('La contraseña debe ocupar como máximo 72 bytes UTF-8');
    }
    const user = await this.usersService.create({ ...dto, password: await hash(dto.password, 12) });
    return this.publicUser(user);
  }
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || Buffer.byteLength(dto.password, 'utf8') > 72 || !(await compare(dto.password, user.password))) {
      throw new BadRequestException('Correo o contraseña incorrectos');
    }
    return { message: 'Inicio de sesión correcto', user: this.publicUser(user) };
  }
}
