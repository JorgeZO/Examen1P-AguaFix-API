import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { envs } from '../config/envs';

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    host: envs.smtpHost,
    port: envs.smtpPort,
    secure: envs.smtpSecure,
    auth: envs.smtpUser
      ? { user: envs.smtpUser, pass: envs.smtpPassword }
      : undefined,
  });

  async sendEmail(to: string, subject: string, template: string): Promise<void> {
    await this.transporter.sendMail({
      from: envs.smtpFrom,
      to,
      subject,
      html: template,
    });
  }
}
