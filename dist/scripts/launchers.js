'use strict';

const fs = require('fs');
const path = require('path');
const { findActionEntryFiles } = require('./install-generator');

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getActionOutputPath(workdir, outDir, sourceFile) {
  const sourceRoot = path.resolve(workdir, 'src');
  const absoluteSourceFile = path.resolve(workdir, sourceFile);
  const relativeSourceFile = toPosix(path.relative(sourceRoot, absoluteSourceFile));
  return relativeSourceFile.replace(/\.ts$/, '');
}

function getImplementationRelativePath(outputRelativePath) {
  const outputDirectory = path.posix.dirname(outputRelativePath);
  const outputBaseName = path.posix.basename(outputRelativePath, '.dsa');
  const implementationDirectory = outputDirectory === '.'
    ? path.posix.join('lib', outputBaseName)
    : path.posix.join(outputDirectory, 'lib', outputBaseName);

  return path.posix.join(implementationDirectory, 'script.dsa');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function getPackageAuthor(pkg) {
  if (!pkg || !pkg.author) {
    return null;
  }

  if (typeof pkg.author === 'string') {
    return pkg.author.trim() || null;
  }

  if (pkg.author && typeof pkg.author.name === 'string') {
    return pkg.author.name.trim() || null;
  }

  return null;
}

function sanitizePathSegment(value, fallback) {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .trim()
    .replace(/^@/, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
    .replace(/[:*?"<>|]/g, '-')
    .trim();

  return normalized || fallback;
}

function getDefaultAppDataPath(workdir) {
  const packageJsonPath = path.join(workdir, 'package.json');
  const packageJson = readJson(packageJsonPath) || {};
  const author = sanitizePathSegment(getPackageAuthor(packageJson), 'DazScript');
  const projectName = sanitizePathSegment(
    typeof packageJson.name === 'string' ? packageJson.name : path.basename(workdir),
    'Scripts'
  );

  return `${author}/${projectName}`;
}

function makeLauncherSource(implementationRelativePath, appDataImplementationRelativePath) {
  return [
    '// Auto-generated launcher shim.',
    '// The installed Daz action points at this stable file.',
    '// The current implementation is resolved from the sibling lib/ directory first,',
    '// and from the AppData fallback location second.',
    '',
    `var implementationRelativePath = '${implementationRelativePath}';`,
    `var appDataImplementationRelativePath = '${appDataImplementationRelativePath}';`,
    'var launcherFileName = getScriptFileName();',
    'var launcherInfo = new DzFileInfo(launcherFileName);',
    'var launcherDirectory = typeof launcherInfo.canonicalPath == "function"',
    '    ? launcherInfo.canonicalPath()',
    '    : launcherInfo.path();',
    'launcherInfo.deleteLater();',
    '',
    "var implementationPath = launcherDirectory + '/' + implementationRelativePath;",
    'var implementationFile = new DzFile(implementationPath);',
    'if (!implementationFile.exists()) {',
    '    implementationFile.deleteLater();',
    "    implementationPath = App.getAppDataPath() + '/' + appDataImplementationRelativePath;",
    '    implementationFile = new DzFile(implementationPath);',
    '}',
    '',
    'if (!implementationFile.exists()) {',
    `    MessageBox.warning('Unable to find script implementation:\\n' + implementationPath, 'Missing Script', '&OK;', '');`,
    '    implementationFile.deleteLater();',
    '} else {',
    '    implementationFile.deleteLater();',
    '',
    '    var script = new DzScript(implementationPath);',
    '    if (!script.loadFromFile(implementationPath, true)) {',
    `        MessageBox.warning('Unable to load script implementation:\\n' + implementationPath, 'Script Load Error', '&OK;', '');`,
    '        script.deleteLater();',
    '    } else {',
    "        var args = typeof getArguments == 'function' ? getArguments() : [];",
    '        script.execute(args);',
    '        script.deleteLater();',
    '    }',
    '}',
    '',
  ].join('\n');
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createActionLaunchers(workdir, options) {
  const outDir = path.resolve(workdir, options.outDir || './out');
  const appDataPath = toPosix(options.appDataPath || getDefaultAppDataPath(workdir));
  const actionEntryFiles = findActionEntryFiles(workdir, {
    scriptsPath: options.scriptsPath || './src',
  });

  actionEntryFiles.forEach((sourceFile) => {
    const outputRelativePath = getActionOutputPath(workdir, outDir, sourceFile);
    const launcherPath = path.join(outDir, outputRelativePath);
    const implementationRelativePath = getImplementationRelativePath(outputRelativePath);
    const implementationPath = path.join(outDir, implementationRelativePath);

    if (!fs.existsSync(launcherPath)) {
      return;
    }

    ensureParentDir(implementationPath);
    if (fs.existsSync(implementationPath)) {
      fs.unlinkSync(implementationPath);
    }

    fs.renameSync(launcherPath, implementationPath);

    const launcherDir = path.dirname(outputRelativePath);
    const relativeImplementationPath = toPosix(
      path.relative(launcherDir || '.', implementationRelativePath)
    );
    const appDataImplementationRelativePath = toPosix(
      path.posix.join(appDataPath, implementationRelativePath)
    );

    fs.writeFileSync(
      launcherPath,
      makeLauncherSource(
        relativeImplementationPath,
        appDataImplementationRelativePath
      )
    );
  });
}

module.exports = {
  createActionLaunchers,
};
