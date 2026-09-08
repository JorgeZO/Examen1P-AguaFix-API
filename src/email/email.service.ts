import { Injectable, OnModuleDestroy } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { envs } from '../config/envs';

@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly transporter = nodemailer.createTransport({
    host: envs.smtpHost, port: envs.smtpPort, secure: envs.smtpSecure,
    auth: envs.smtpUser ? { user: envs.smtpUser, pass: envs.smtpPassword } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });

  async sendEmail(to: string, subject: string, template: string): Promise<void> {
    const result = await this.transporter.sendMail({ from: envs.smtpFrom, to, subject, html: template });
    if (!result.accepted.length || result.rejected.length) {
      throw new Error('El servidor SMTP no aceptó el destinatario');
    }
  }
  onModuleDestroy(): void { this.transporter.close(); }
}
