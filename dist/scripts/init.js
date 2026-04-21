'use strict';

const fs = require('fs');
const path = require('path');

function normalizePath(value, fallback) {
  if (!value) {
    return fallback;
  }

  return value.replace(/\\/g, '/');
}

function formatConfigPath(value) {
  if (value.startsWith('./') || value.startsWith('../') || value.startsWith('/')) {
    return value;
  }

  return `./${value}`;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, json) {
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function writeFileIfNeeded(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    console.log(`skip ${path.basename(filePath)}`);
    return false;
  }

  fs.writeFileSync(filePath, content);
  console.log(`write ${path.basename(filePath)}`);
  return true;
}

function buildConfigContent(options) {
  return `import { defineConfig } from 'dazscript-framework/config';

export default defineConfig({
  scriptsPath: '${options.scriptsPath}',
  outDir: '${options.outDir}',
  defaultMenuPath: '${options.menuPath}',
});
`;
}

function buildTsconfigContent() {
  return `{
  "extends": "./node_modules/dazscript-framework/tsconfig.json",
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "shared/*": ["src/shared/*"],
      "@dst/*": ["node_modules/dazscript-types/src/types/*"],
      "@dsf/*": ["node_modules/dazscript-framework/src/*"]
    }
  },
  "include": ["node_modules/dazscript-types/src/types/**/*", "src/**/*"]
}
`;
}

function updatePackageJson(workdir, options) {
  const packageJsonPath = path.join(workdir, 'package.json');
  const packageJson = fs.existsSync(packageJsonPath)
    ? readJson(packageJsonPath)
    : { private: true };

  if (packageJson.sideEffects === undefined) {
    packageJson.sideEffects = false;
  }

  packageJson.scripts = {
    ...(packageJson.scripts || {}),
    prebuild: 'npm run installer',
    build: 'dazscript build',
    postbuild: 'npm run icons',
    watch: 'dazscript watch',
    icons: 'dazscript icons',
    installer: 'dazscript installer',
  };

  writeJson(packageJsonPath, packageJson);
  console.log('update package.json');
}

function initProject(workdir, rawOptions) {
  const options = {
    force: Boolean(rawOptions.force),
    menuPath: normalizePath(rawOptions.menuPath, '/MyScripts'),
    scriptsPath: normalizePath(rawOptions.scriptsPath, './src'),
    outDir: normalizePath(rawOptions.outDir, './out'),
  };

  writeFileIfNeeded(
    path.join(workdir, 'dazscript.config.ts'),
    buildConfigContent(options),
    options.force
  );
  writeFileIfNeeded(
    path.join(workdir, 'tsconfig.json'),
    buildTsconfigContent(),
    options.force
  );

  updatePackageJson(workdir, options);
}

module.exports = {
  initProject,
};
