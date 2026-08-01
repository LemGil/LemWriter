// IPC handlers for database backup/restore
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const https = require('https');
const { app } = require('electron');
const logger = require('../logger');
const { validate, BackupRestoreSchema } = require('../schemas/ipc-schemas');

/**
 * Sube un archivo a Supabase Storage desde el proceso main usando https.request
 * nativo (HTTP/1.1). Evita el stack HTTP/2/QUIC del renderer, que falla contra
 * Cloudflare desde algunas redes con "Failed to fetch".
 * @returns {Promise<{success: boolean, path?: string, size_bytes?: number, error?: string}>}
 */
/**
 * Sube un archivo a Supabase Storage desde el proceso main usando https.request
 * nativo (HTTP/1.1). Implementa reintentos automáticos para errores de red.
 */
async function uploadToSupabaseStorage(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const result = await uploadToSupabaseStorageInternal(params);
    if (result.success) return result;

    // Si es un error de red (ECONNRESET, Timeout, etc.), reintentar
    logger.warn({ attempt: i + 1, error: result.error }, 'Upload failed, retrying...');
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 5000 * (i + 1))); // Espera exponencial
    } else {
      return result;
    }
  }
}

function uploadToSupabaseStorageInternal({ supabaseUrl, anonKey, bucket, filename, data }) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(supabaseUrl);
      const pathname = `/storage/v1/object/${bucket}/${encodeURIComponent(filename)}`;
      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length,
        'x-upsert': 'true',
      };
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: pathname,
          method: 'POST',
          headers,
          protocol: 'https:',
          ALPNProtocols: ['http/1.1'],
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              let parsedBody = {};
              try { parsedBody = JSON.parse(body); } catch { /* ignorar */ }
              resolve({
                success: true,
                path: parsedBody.Key || filename,
                size_bytes: data.length,
              });
            } else {
              resolve({ success: false, error: `HTTP ${res.statusCode}: ${body.slice(0, 200)}` });
            }
          });
        }
      );
      req.setTimeout(600000, () => {
        req.destroy(new Error('Timeout subiendo a Supabase (10 min)'));
      });
      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      req.write(data);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Registra un backup en la tabla lw_backups vía la REST API.
 */
function insertBackupLog({ supabaseUrl, anonKey, filename, sizeBytes, storagePath }) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(supabaseUrl);
      const payload = JSON.stringify({
        filename,
        size_bytes: sizeBytes,
        storage_path: storagePath,
      });
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: '/rest/v1/lw_backups',
          method: 'POST',
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Prefer': 'return=minimal',
          },
          protocol: 'https:',
          ALPNProtocols: ['http/1.1'],
        },
        (res) => {
          res.resume();
          res.on('end', () => {
            resolve(res.statusCode >= 200 && res.statusCode < 300);
          });
        }
      );
      req.setTimeout(60000, () => req.destroy(new Error('Timeout')));
      req.on('error', () => resolve(false));
      req.write(payload);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function register(ipcMain, db) {
  ipcMain.handle('backup:db', async () => {
    try {
      const dbPath = db.name;
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `lemwriter-${timestamp}.db`);
      fs.copyFileSync(dbPath, backupPath);

      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('lemwriter-') && f.endsWith('.db'))
        .sort()
        .reverse();

      if (backups.length > 10) {
        backups.slice(10).forEach(f => {
          fs.unlinkSync(path.join(backupDir, f));
        });
      }

      const count = Math.min(backups.length, 10);
      logger.info({ backupPath, count }, 'Backup created');
      return { success: true, path: backupPath, count };
    } catch (error) {
      logger.error({ err: error, handler: 'backup:db' }, 'Backup error');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:list', async () => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) return [];
      return fs.readdirSync(backupDir)
        .filter(f => f.startsWith('lemwriter-') && f.endsWith('.db'))
        .sort()
        .reverse()
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          size: fs.statSync(path.join(backupDir, f)).size,
          date: f.replace('lemwriter-', '').replace('.db', '').replace(/-/g, ':').replace('T', ' ').slice(0, 19),
        }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('backup:read-db', async (_event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      // Comprimir con gzip (nivel 9: máximo) para reducir drásticamente el tamaño
      const gzipped = zlib.gzipSync(buffer, { level: 9 });
      logger.info(
        { originalSize: buffer.length, compressedSize: gzipped.length },
        'backup:read-db gzip (level 9)'
      );
      return { success: true, data: gzipped.toString('base64'), compressed: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:upload-cloud', async (_event, { filePath, filename, supabaseUrl, anonKey }) => {
    try {
      const bucket = 'lemwriter-backups';
      // Los backups se suben comprimidos con gzip
      const storageName = filename.endsWith('.gz') ? filename : `${filename}.gz`;
      const buffer = fs.readFileSync(filePath);
      const gzipped = zlib.gzipSync(buffer);

      logger.info(
        { originalSize: buffer.length, compressedSize: gzipped.length, filename: storageName },
        'backup:upload-cloud start'
      );

      const up = await uploadToSupabaseStorage({
        supabaseUrl,
        anonKey,
        bucket,
        filename: storageName,
        data: gzipped,
      });
      if (!up.success) {
        logger.error({ err: up.error, handler: 'backup:upload-cloud' }, 'Upload error');
        return { success: false, error: up.error };
      }

      const logged = await insertBackupLog({
        supabaseUrl,
        anonKey,
        filename: storageName,
        sizeBytes: up.size_bytes,
        storagePath: up.path,
      });

      logger.info({ filename: storageName, logged }, 'backup:upload-cloud complete');
      return { success: true, path: up.path, size_bytes: up.size_bytes, logged };
    } catch (error) {
      logger.error({ err: error, handler: 'backup:upload-cloud' }, 'Upload error');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:restore-cloud', async (_event, base64Data) => {
    try {
      const dbPath = db.name;
      const rawBuffer = Buffer.from(base64Data, 'base64');
      // Detectar gzip por magic bytes (1f 8b) y descomprimir si aplica
      let buffer = rawBuffer;
      if (rawBuffer.length > 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
        buffer = zlib.gunzipSync(rawBuffer);
        logger.info(
          { compressedSize: rawBuffer.length, restoredSize: buffer.length },
          'backup:restore-cloud gunzip'
        );
      }
      db.close();
      fs.writeFileSync(dbPath, buffer);
      logger.warn({}, 'Database restored from cloud — relaunching');
      app.relaunch();
      app.exit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:restore', async (_event, backupPath) => {
    try {
      const { backupPath: validatedPath } = validate(BackupRestoreSchema, { backupPath }, 'backup:restore');
      const dbPath = db.name;
      db.close();
      fs.copyFileSync(validatedPath, dbPath);
      logger.warn({ backupPath: validatedPath }, 'Database restored — relaunching');
      app.relaunch();
      app.exit();
      return { success: true };
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'backup:restore' }, 'Restore error');
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
