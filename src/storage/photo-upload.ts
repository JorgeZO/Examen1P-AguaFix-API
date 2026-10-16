import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export const PhotoInterceptor = () => FileInterceptor('photo', {
  limits: { fileSize: MAX_PHOTO_SIZE, files: 1 },
});

// ParseFilePipe devuelve BadRequestException si falta el archivo.
// FileTypeValidator comprueba la firma binaria, además del MIME declarado.
export const photoValidationPipe = () => new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new MaxFileSizeValidator({ maxSize: MAX_PHOTO_SIZE }),
    new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/, overrideMimeType: true }),
  ],
});
