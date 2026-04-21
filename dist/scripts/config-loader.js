'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModuleFromString(code, filename) {
  const module = { exports: {} };
  const dirname = path.dirname(filename);
  const localRequire = (request) => {
    if (request.startsWith('.')) {
      return require(path.resolve(dirname, request));
    }

    return require(request);
  };

  const fn = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    code
  );

  fn(module.exports, localRequire, module, filename, dirname);
  return module.exports;
}

function getConfigCandidates(workdir) {
  return [
    path.join(workdir, 'dazscript.config.ts'),
    path.join(workdir, 'dazscript.config.js'),
    path.join(workdir, 'dazscript.config.cjs'),
  ];
}

function loadTsConfig(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: filePath,
  });

  const loaded = loadModuleFromString(transpiled.outputText, filePath);
  return loaded.default || loaded;
}

function loadJsConfig(filePath) {
  const loaded = require(filePath);
  return loaded.default || loaded;
}

function loadConfig(workdir) {
  for (const candidate of getConfigCandidates(workdir)) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const config = candidate.endsWith('.ts')
      ? loadTsConfig(candidate)
      : loadJsConfig(candidate);

    return {
      config,
      filePath: candidate,
    };
  }

  return {
    config: {},
    filePath: null,
  };
}

module.exports = {
  loadConfig,
};
