import { BadRequestException, Injectable } from '@nestjs/common';
import { compare, hash, truncates } from 'bcryptjs';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: CreateUserDto) {
    // bcrypt solo procesa los primeros 72 bytes de una contraseña.
    if (truncates(dto.password)) {
      throw new BadRequestException('La contraseña supera el límite de 72 bytes de bcrypt');
    }

    const hashedPassword = await hash(dto.password, 12);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    // Se devuelve el usuario sin incluir la contraseña.
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || truncates(dto.password)) {
      throw new BadRequestException('Correo o contraseña incorrectos');
    }

    const validPassword = await compare(dto.password, user.password);
    if (!validPassword) {
      throw new BadRequestException('Correo o contraseña incorrectos');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
