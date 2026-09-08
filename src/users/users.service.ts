import { ConflictException, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  async create(dto: CreateUserDto) {
    try { return await this.usersRepository.create(dto); }
    catch (error) {
      if (error instanceof QueryFailedError && error.driverError.code === '23505') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
  }
  findByEmailWithPassword(email: string) { return this.usersRepository.findByEmailWithPassword(email); }
}
