import 'dotenv/config';
import * as env from 'env-var';

export const envs = {
  port: env.get('PORT').default('3000').asPortNumber(),
  host: env.get('HOST').default('127.0.0.1').asString(),
  dbHost: env.get('DB_HOST').required().asString(),
  dbPort: env.get('DB_PORT').default('5432').asPortNumber(),
  dbUsername: env.get('DB_USERNAME').required().asString(),
  dbPassword: env.get('DB_PASSWORD').required().asString(),
  dbDatabase: env.get('DB_DATABASE').required().asString(),
  smtpHost: env.get('SMTP_HOST').required().asString(),
  smtpPort: env.get('SMTP_PORT').default('587').asPortNumber(),
  smtpSecure: env.get('SMTP_SECURE').default('false').asBoolStrict(),
  smtpUser: env.get('SMTP_USER').asString(),
  smtpPassword: env.get('SMTP_PASSWORD').asString(),
  smtpFrom: env.get('SMTP_FROM').required().asString(),
  maintenanceEmail: env.get('MAINTENANCE_EMAIL').required().asEmailString(),
};
