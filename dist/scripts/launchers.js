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

function makeLauncherSource(implementationRelativePath) {
  return [
    '(function () {',
    `    var __implementationRelativePath = '${implementationRelativePath}';`,
    "    var __sourceFile = getScriptFileName();",
    '    var __sourceInfo = new DzFileInfo(__sourceFile);',
    '    var __sourceDir = typeof (__sourceInfo.canonicalPath) == "function"',
    '        ? __sourceInfo.canonicalPath()',
    '        : __sourceInfo.path();',
    '    __sourceInfo.deleteLater();',
    "    var __implementationPath = __sourceDir + '/' + __implementationRelativePath;",
    '    var __implementationFile = new DzFile(__implementationPath);',
    '    if (!__implementationFile.exists()) {',
    `        MessageBox.warning('Unable to find script implementation:\\n' + __implementationPath, 'Missing Script', '&OK;', '');`,
    '        __implementationFile.deleteLater();',
    '        return;',
    '    }',
    '    __implementationFile.deleteLater();',
    '    var __script = new DzScript(__implementationPath);',
    '    if (!__script.loadFromFile(__implementationPath, true)) {',
    `        MessageBox.warning('Unable to load script implementation:\\n' + __implementationPath, 'Script Load Error', '&OK;', '');`,
    '        __script.deleteLater();',
    '        return;',
    '    }',
    "    var __args = typeof getArguments === 'function' ? getArguments() : [];",
    '    __script.execute(__args);',
    '    __script.deleteLater();',
    '})();',
    '',
  ].join('\n');
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createActionLaunchers(workdir, options) {
  const outDir = path.resolve(workdir, options.outDir || './out');
  const actionEntryFiles = findActionEntryFiles(workdir, {
    scriptsPath: options.scriptsPath || './src',
  });

  actionEntryFiles.forEach((sourceFile) => {
    const outputRelativePath = getActionOutputPath(workdir, outDir, sourceFile);
    const launcherPath = path.join(outDir, outputRelativePath);
    const implementationRelativePath = toPosix(path.join('lib', outputRelativePath));
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

    fs.writeFileSync(launcherPath, makeLauncherSource(relativeImplementationPath));
  });
}

module.exports = {
  createActionLaunchers,
};
