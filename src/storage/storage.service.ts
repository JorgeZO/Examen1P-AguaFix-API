import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { envs } from '../config/envs';

@Injectable()
export class StorageService {
  // El SDK lee las credenciales del entorno o del rol IAM de la aplicación.
  private readonly client = new S3Client({ region: envs.awsRegion });

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const prefix = folder.replace(/^\/+|\/+$/g, '');
    const key = `${prefix}/${randomUUID()}.${extensions[file.mimetype]}`;

    await this.client.send(new PutObjectCommand({
      Bucket: envs.awsS3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `https://${envs.awsS3Bucket}.s3.${envs.awsRegion}.amazonaws.com/${encodedKey}`;
  }
}
