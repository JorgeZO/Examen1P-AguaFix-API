const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');
require('dotenv/config');

test('API con PostgreSQL real, SMTP local y protocolo S3 local', async t => {
  const database = `water_test_${process.pid}_${Date.now()}`;
  const admin = new Client({ host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME || process.env.USER,
    password: process.env.DB_PASSWORD, database: 'postgres' });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  const messages = [];
  const uploads = [];
  let rejectUpload = false;
  // Doble HTTP de S3: se usa el SDK real, pero no una cuenta de AWS.
  const s3 = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (rejectUpload) {
      response.writeHead(503, { 'Content-Type': 'application/xml' });
      return response.end('<Error><Code>ServiceUnavailable</Code></Error>');
    }
    uploads.push({ path: request.url, method: request.method,
      contentType: request.headers['content-type'], body: Buffer.concat(chunks) });
    response.writeHead(200, { ETag: '"local-test"' });
    response.end();
  });
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
    if (s3.listening) await new Promise(resolve => s3.close(resolve));
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end();
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => s3.listen(0, '127.0.0.1', resolve));
  Object.assign(process.env, { DB_HOST: process.env.DB_HOST || '127.0.0.1',
    DB_PORT: process.env.DB_PORT || '5432', DB_USERNAME: process.env.DB_USERNAME || process.env.USER,
    DB_PASSWORD: process.env.DB_PASSWORD || randomBytes(24).toString('hex'), DB_DATABASE: database,
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.server.address().port), SMTP_SECURE: 'false',
    SMTP_USER: '', SMTP_PASSWORD: '', SMTP_FROM: 'reportes@municipio.test',
    MAINTENANCE_EMAIL: 'cuadrilla@municipio.test', AWS_REGION: 'us-east-1',
    AWS_S3_BUCKET: 'aguafix-test', AWS_ACCESS_KEY_ID: randomBytes(12).toString('hex'),
    AWS_SECRET_ACCESS_KEY: randomBytes(24).toString('hex'), AWS_SESSION_TOKEN: '',
    AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${s3.address().port}`, AWS_MAX_ATTEMPTS: '1' });
  dataSource = require('../dist/database/data-source').default;
  await dataSource.initialize();
  await t.test('migración nueva conserva reportes anteriores; down y up; synchronize false', async () => {
    assert.equal(dataSource.options.synchronize, false);
    const photoMigration = dataSource.migrations.find(m => m.name.startsWith('AddReportPhotos'));
    dataSource.migrations = dataSource.migrations.filter(m => m !== photoMigration);
    assert.equal((await dataSource.runMigrations()).length, 1);
    await dataSource.query(`INSERT INTO "WATER_REPORT" (address, description, severity, "reporterPhone")
      VALUES ('Reporte anterior', 'Primer parcial', 'low', '5551234567')`);
    dataSource.migrations.push(photoMigration);
    assert.equal((await dataSource.runMigrations()).length, 1);
    let [legacy] = await dataSource.query('SELECT * FROM "WATER_REPORT"');
    assert.equal(legacy.photoUrl, null);
    assert.equal(legacy.repairPhotoUrl, null);
    await dataSource.undoLastMigration();
    [legacy] = await dataSource.query('SELECT * FROM "WATER_REPORT"');
    assert.equal(legacy.address, 'Reporte anterior');
    assert.equal(legacy.photoUrl, undefined);
    assert.equal((await dataSource.runMigrations()).length, 1);
    assert.equal((await dataSource.runMigrations()).length, 0);
    assert.deepEqual((await dataSource.driver.createSchemaBuilder().log()).upQueries, []);
    await dataSource.query('DELETE FROM "WATER_REPORT"');
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
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const account = { name: 'Ana López', email: 'ana@example.test', password: 'AguaSegura2026!' };
  const report = { address: 'Av. Reforma 120, frente al parque',
    description: 'Sale agua de la banqueta <script>alert("x")</script>',
    severity: 'high', reporterPhone: '+52 555 123 4567' };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const multipart = (fields = {}, { bytes = png, mime = 'image/png', field = 'photo', filename = 'fuga.png' } = {}) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
    if (bytes !== null) form.append(field, new Blob([bytes], { type: mime }), filename);
    return form;
  };
  let reportId;
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
  await t.test('POST exige foto válida; rechazos no suben, no guardan ni envían correo', async () => {
    assert.equal((await request('POST', '/reports', report)).status, 400);
    for (const options of [{ bytes: null }, { bytes: Buffer.alloc(0) },
      { bytes: Buffer.from('<script>alert(1)</script>'), mime: 'image/png' },
      { field: 'other' }]) {
      assert.equal((await request('POST', '/reports', multipart(report, options))).status, 400);
    }
    assert.equal((await request('POST', '/reports', multipart(report, { bytes: Buffer.alloc(5 * 1024 * 1024 + 1) }))).status, 413);
    assert.equal(uploads.length, 0);
    assert.equal(messages.length, 0);
    assert.equal((await dataSource.query('SELECT * FROM "WATER_REPORT"')).length, 0);
  });
  await t.test('POST sube bytes a reports/, persiste URL y envía correo con img', async () => {
    // El MIME del objeto se toma del contenido, no de la extensión o del cliente.
    const res = await request('POST', '/reports', multipart(report, { mime: 'image/jpeg', filename: '../../fuga.jpg' }));
    assert.equal(res.status, 201); assert.equal(res.body.notification, undefined);
    assert.equal(res.body.isResolved, false); assert.ok(res.body.id);
    assert.ok(Date.parse(res.body.createdAt)); assert.equal(messages.length, 1);
    reportId = res.body.id;
    assert.match(res.body.photoUrl, /^https:\/\/aguafix-test\.s3\.us-east-1\.amazonaws\.com\/reports\/[a-f0-9-]+\.png$/);
    assert.equal(res.body.repairPhotoUrl, null);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0].method, 'PUT');
    assert.match(uploads[0].path, /^\/aguafix-test\/reports\/[a-f0-9-]+\.png/);
    assert.equal(uploads[0].contentType, 'image/png');
    assert.deepEqual(uploads[0].body, png);
    assert.ok(messages[0].html.includes(`<img src="${res.body.photoUrl}"`));
    assert.equal(messages[0].to.value[0].address, 'cuadrilla@municipio.test');
    for (const value of [report.address, report.severity, report.reporterPhone, '&lt;script&gt;']) {
      assert.ok(messages[0].html.includes(value));
    }
    assert.ok(!messages[0].html.includes('<script>'));
    assert.equal((await dataSource.query('SELECT * FROM "WATER_REPORT"')).length, 1);
  });
  await t.test('DTO rechaza datos inválidos y campos controlados por servidor sin guardar ni enviar', async () => {
    for (const patch of [{ severity: 'critical' }, { address: '' }, { description: '' },
      { reporterPhone: '' }, { isResolved: true }, { photoUrl: 'https://example.test/fake.png' },
      { repairPhotoUrl: 'https://example.test/fake.png' }, { id: 99 }, { createdAt: '2020-01-01' }]) {
      assert.equal((await request('POST', '/reports', multipart({ ...report, ...patch }))).status, 400);
    }
    assert.equal((await request('POST', '/reports', {})).status, 400);
    assert.equal((await dataSource.query('SELECT * FROM "WATER_REPORT"')).length, 1);
    assert.equal(messages.length, 1);
    assert.equal(uploads.length, 1);
  });
  await t.test('restricción de severidad también existe en PostgreSQL', async () => {
    await assert.rejects(dataSource.query(`UPDATE "WATER_REPORT" SET severity = 'urgent'`), { code: '23514' });
  });
  await t.test('low y medium también se guardan; GET lista todos los reportes', async () => {
    for (const severity of ['low', 'medium']) {
      const res = await request('POST', '/reports', multipart({ ...report, severity }));
      assert.equal(res.status, 201);
      assert.equal(res.body.severity, severity);
    }
    const res = await request('GET', '/reports');
    const stored = await dataSource.query('SELECT * FROM "WATER_REPORT"');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.sort((a, b) => a.id - b.id), JSON.parse(JSON.stringify(stored)).sort((a, b) => a.id - b.id));
    assert.ok(res.body.every(item => item.photoUrl && item.repairPhotoUrl === null));
    assert.equal(messages.length, 3);
  });
  await t.test('cierre exige foto, ID válido y reporte existente antes de subir', async () => {
    const before = uploads.length;
    assert.equal((await request('PATCH', `/reports/${reportId}/resolve`, multipart({}, { bytes: null }))).status, 400);
    assert.equal((await request('PATCH', `/reports/${reportId}/resolve`, multipart({}, { bytes: Buffer.from('falso') }))).status, 400);
    assert.equal((await request('PATCH', '/reports/no-es-id/resolve', multipart())).status, 400);
    assert.equal((await request('PATCH', '/reports/999999/resolve', multipart())).status, 404);
    assert.equal(uploads.length, before);
    const [stored] = await dataSource.query('SELECT * FROM "WATER_REPORT" WHERE id = $1', [reportId]);
    assert.equal(stored.isResolved, false);
    assert.equal(stored.repairPhotoUrl, null);
  });
  await t.test('cierre sube a repairs/ y GET devuelve las dos URL; no permite cerrar dos veces', async () => {
    const before = uploads.length;
    const res = await request('PATCH', `/reports/${reportId}/resolve`, multipart());
    assert.equal(res.status, 200);
    assert.equal(res.body.isResolved, true);
    assert.match(res.body.repairPhotoUrl, /\/repairs\/[a-f0-9-]+\.png$/);
    assert.match(uploads.at(-1).path, /^\/aguafix-test\/repairs\//);
    assert.deepEqual(uploads.at(-1).body, png);
    assert.equal(uploads.length, before + 1);
    const list = await request('GET', '/reports');
    assert.deepEqual(list.body.find(item => item.id === reportId), res.body);
    assert.equal((await request('PATCH', `/reports/${reportId}/resolve`, multipart())).status, 400);
    assert.equal(uploads.length, before + 1);
  });
  await t.test('fallo S3 no crea reporte ni correo; tampoco cierra sin foto guardada', async () => {
    rejectUpload = true;
    try {
      const rows = await dataSource.query('SELECT * FROM "WATER_REPORT" ORDER BY id');
      const mailsBefore = messages.length;
      assert.equal((await request('POST', '/reports', multipart(report))).status, 500);
      assert.equal((await request('PATCH', `/reports/${rows[1].id}/resolve`, multipart())).status, 500);
      assert.equal(messages.length, mailsBefore);
      assert.deepEqual(await dataSource.query('SELECT * FROM "WATER_REPORT" ORDER BY id'), rows);
    } finally { rejectUpload = false; }
  });
  await t.test('no se impone longitud mínima de contraseña', async () => {
    const res = await request('POST', '/auth/register', { ...account, email: 'simple@example.test', password: 'a' });
    assert.equal(res.status, 201);
    const login = await request('POST', '/auth/login', { email: 'simple@example.test', password: 'a' });
    assert.equal(login.status, 200);
  });
  await t.test('fallo SMTP devuelve 500 y el reporte ya guardado permanece', async () => {
    rejectMail = true;
    const res = await request('POST', '/reports', multipart({ ...report, severity: 'low' }));
    assert.equal(res.status, 500);
    assert.equal(messages.length, 3);
    const list = await request('GET', '/reports');
    assert.equal(list.status, 200); assert.equal(list.body.length, 4);
    assert.equal(list.body.filter(item => item.severity === 'low').length, 2);
  });
});
