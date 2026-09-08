import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}
  create(dto: CreateUserDto): Promise<User> { return this.repository.save(this.repository.create(dto)); }
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository.createQueryBuilder('user').addSelect('user.password')
      .where('user.email = :email', { email }).getOne();
  }
}
