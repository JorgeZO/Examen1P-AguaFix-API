const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
require('dotenv/config');

test('API con PostgreSQL real, migraciones y SMTP local', async t => {
  const database = `water_test_${process.pid}_${Date.now()}`;
  const admin = new Client({ host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME || 'water',
    password: process.env.DB_PASSWORD || 'water_local_only', database: 'postgres' });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  const messages = [];
  let rejectMail = false;
  const smtp = new SMTPServer({ authOptional: true, disabledCommands: ['STARTTLS'],
    onData(stream, session, callback) {
      simpleParser(stream).then(mail => {
        if (rejectMail) return callback(new Error('Fallo SMTP de prueba'));
        messages.push(mail); callback();
      }).catch(callback);
    } });
  let app, dataSource;
  t.after(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (smtp.server.listening) await new Promise(resolve => smtp.close(resolve));
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end();
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  Object.assign(process.env, { DB_HOST: process.env.DB_HOST || '127.0.0.1',
    DB_PORT: process.env.DB_PORT || '5432', DB_USERNAME: process.env.DB_USERNAME || 'water',
    DB_PASSWORD: process.env.DB_PASSWORD || 'water_local_only', DB_DATABASE: database,
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.server.address().port), SMTP_SECURE: 'false',
    SMTP_USER: '', SMTP_PASSWORD: '', SMTP_FROM: 'reportes@municipio.test',
    MAINTENANCE_EMAIL: 'cuadrilla@municipio.test' });
  dataSource = require('../dist/database/data-source').default;
  await dataSource.initialize();
  await t.test('migración up, down y up; synchronize desactivado', async () => {
    assert.equal(dataSource.options.synchronize, false);
    assert.equal((await dataSource.runMigrations()).length, 1);
    await dataSource.undoLastMigration();
    assert.equal((await dataSource.runMigrations()).length, 1);
    assert.equal((await dataSource.runMigrations()).length, 0);
    assert.deepEqual((await dataSource.driver.createSchemaBuilder().log()).upQueries, []);
  });
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module');
  const { createValidationPipe } = require('../dist/config/validation');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(createValidationPipe());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const request = async (method, path, body) => {
    const response = await fetch(base + path, { method,
      headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const account = { name: 'Ana López', email: 'ana@example.test', password: 'AguaSegura2026!' };
  const report = { address: 'Av. Reforma 120, frente al parque',
    description: 'Sale agua de la banqueta <script>alert("x")</script>',
    severity: 'high', reporterPhone: '+52 555 123 4567' };
  await t.test('GET /reports inicia vacío', async () => {
    assert.deepEqual(await request('GET', '/reports'), { status: 200, body: [] });
  });
  await t.test('registro hashea con bcrypt y no expone password', async () => {
    const res = await request('POST', '/auth/register', account);
    assert.equal(res.status, 201); assert.equal(res.body.email, account.email);
    assert.equal(res.body.isNotificationEnabled, true); assert.equal(res.body.password, undefined);
    const [stored] = await dataSource.query('SELECT * FROM "SYSTEM_USER"');
    assert.notEqual(stored.password, account.password);
    assert.match(stored.password, /^\$2[aby]\$12\$/);
    assert.equal(await require('bcryptjs').compare(account.password, stored.password), true);
  });
  await t.test('correo duplicado devuelve 409', async () => {
    assert.equal((await request('POST', '/auth/register', account)).status, 409);
  });
  await t.test('login válido devuelve 200 sin password', async () => {
    const res = await request('POST', '/auth/login', { email: account.email, password: account.password });
    assert.equal(res.status, 200); assert.equal(res.body.password, undefined);
  });
  await t.test('credenciales incorrectas y usuario inexistente devuelven 400 claro', async () => {
    for (const email of [account.email, 'nadie@example.test']) {
      const res = await request('POST', '/auth/login', { email, password: 'Incorrecta123!' });
      assert.equal(res.status, 400); assert.equal(res.body.message, 'Correo o contraseña incorrectos');
    }
  });
  await t.test('validación de usuarios y límite bcrypt en bytes', async () => {
    for (const patch of [{ email: 'invalido' }, { password: '' },
      { isNotificationEnabled: 'false' }, { isNotificationEnabled: null },
      { name: '' }, { password: '🔑'.repeat(20) }]) {
      assert.equal((await request('POST', '/auth/register', { ...account, ...patch })).status, 400);
    }
  });
  await t.test('isNotificationEnabled acepta false explícito', async () => {
    const res = await request('POST', '/auth/register', { ...account, email: 'otro@example.test', isNotificationEnabled: false });
    assert.equal(res.status, 201); assert.equal(res.body.isNotificationEnabled, false);
  });
  await t.test('POST persiste y envía SMTP con HTML escapado y los cuatro datos', async () => {
    const res = await request('POST', '/reports', report);
    assert.equal(res.status, 201); assert.equal(res.body.notification, undefined);
    assert.equal(res.body.isResolved, false); assert.ok(res.body.id);
    assert.ok(Date.parse(res.body.createdAt)); assert.equal(messages.length, 1);
    assert.equal(messages[0].to.value[0].address, 'cuadrilla@municipio.test');
    for (const value of [report.address, report.severity, report.reporterPhone, '&lt;script&gt;']) {
      assert.ok(messages[0].html.includes(value));
    }
    assert.ok(!messages[0].html.includes('<script>'));
    assert.equal((await dataSource.query('SELECT * FROM "WATER_REPORT"')).length, 1);
  });
  await t.test('DTO rechaza datos inválidos y campos controlados por servidor sin guardar ni enviar', async () => {
    for (const patch of [{ severity: 'critical' }, { address: '' }, { description: '' },
      { reporterPhone: '' }, { reporterPhone: 12345 }, { isResolved: true },
      { id: 99 }, { createdAt: '2020-01-01' }]) {
      assert.equal((await request('POST', '/reports', { ...report, ...patch })).status, 400);
    }
    assert.equal((await request('POST', '/reports', {})).status, 400);
    assert.equal((await dataSource.query('SELECT * FROM "WATER_REPORT"')).length, 1);
    assert.equal(messages.length, 1);
  });
  await t.test('restricción de severidad también existe en PostgreSQL', async () => {
    await assert.rejects(dataSource.query(`UPDATE "WATER_REPORT" SET severity = 'urgent'`), { code: '23514' });
  });
  await t.test('low y medium también se guardan; GET lista todos los reportes', async () => {
    for (const severity of ['low', 'medium']) {
      const res = await request('POST', '/reports', { ...report, severity });
      assert.equal(res.status, 201);
      assert.equal(res.body.severity, severity);
    }
    const res = await request('GET', '/reports');
    const stored = await dataSource.query('SELECT * FROM "WATER_REPORT"');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, JSON.parse(JSON.stringify(stored)));
    assert.equal(messages.length, 3);
  });
  await t.test('no se impone longitud mínima de contraseña', async () => {
    const res = await request('POST', '/auth/register', { ...account, email: 'simple@example.test', password: 'a' });
    assert.equal(res.status, 201);
    const login = await request('POST', '/auth/login', { email: 'simple@example.test', password: 'a' });
    assert.equal(login.status, 200);
  });
  await t.test('fallo SMTP devuelve 500 y el reporte ya guardado permanece', async () => {
    rejectMail = true;
    const res = await request('POST', '/reports', { ...report, severity: 'low' });
    assert.equal(res.status, 500);
    assert.equal(messages.length, 3);
    const list = await request('GET', '/reports');
    assert.equal(list.status, 200); assert.equal(list.body.length, 4);
    assert.equal(list.body.filter(item => item.severity === 'low').length, 2);
  });
});
