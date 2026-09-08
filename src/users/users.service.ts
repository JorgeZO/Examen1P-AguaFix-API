import { ConflictException, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    try {
      return await this.usersRepository.create(dto);
    } catch (error) {
      // 23505 es el error de PostgreSQL para un valor único repetido.
      if (error instanceof QueryFailedError && error.driverError.code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
  }

  findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
}
