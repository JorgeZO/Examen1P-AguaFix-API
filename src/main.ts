import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { createValidationPipe } from './config/validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();
  await app.listen(envs.port, envs.host);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
