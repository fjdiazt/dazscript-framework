'use strict';

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function validateAppDataPath(appDataPath, workdir) {
  if (!appDataPath || typeof appDataPath !== 'string') {
    throw new Error(
      `[dazscript] Missing required appDataPath in ${workdir}. ` +
      `Set appDataPath: 'Author/Product' in dazscript.config.ts.`
    );
  }

  const normalized = toPosix(appDataPath).trim().replace(/^\/+|\/+$/g, '');
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length < 2) {
    throw new Error(
      `[dazscript] Invalid appDataPath "${appDataPath}" in ${workdir}. ` +
      `Use at least two segments, for example 'Author/Product'.`
    );
  }

  const blockedSegments = new Set([
    'appdata',
    'cache',
    'data',
    'lib',
    'libs',
    'script',
    'scripts',
    'temp',
    'tmp',
  ]);

  const invalidSegment = segments.find((segment) => blockedSegments.has(segment.toLowerCase()));
  if (invalidSegment) {
    throw new Error(
      `[dazscript] Invalid appDataPath "${appDataPath}" in ${workdir}. ` +
      `Path segments like "${invalidSegment}" are too generic. Use a unique Author/Product path.`
    );
  }

  return normalized;
}

module.exports = {
  validateAppDataPath,
};
