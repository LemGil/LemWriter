// LemWriter structured logger — wraps pino for the main process.
//
// Usage:
//   const logger = require('./logger');
//   logger.info({ projectId }, 'Proyecto abierto');
//   logger.error(err, 'Error en extractReferences');
//   logger.warn({ handler: 'backup:restore' }, 'Fallo silencioso');
//
// Logs are written to app.log in the user data directory plus stderr.
// In development, pretty-prints to stderr for readability.

const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Determine log directory — try userData, fall back to project root
function getLogDir() {
  try {
    const { app } = require('electron');
    return app.getPath('userData');
  } catch {
    // Fallback when app is not ready (e.g. during tests or early init)
    return path.join(__dirname, '..');
  }
}

const logDir = getLogDir();
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const isDev = process.env.NODE_ENV === 'development';

const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino/file',
      options: {
        destination: path.join(logDir, 'app.log'),
        sync: true,
      },
    },
  }),
  ...(!isDev && {
    transport: {
      target: 'pino/file',
      options: {
        destination: path.join(logDir, 'app.log'),
        sync: true,
      },
    },
  }),
  // Always also write to stderr if not in production silent mode
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

module.exports = logger;
