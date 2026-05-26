#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const fixtureSource = path.join(__dirname, 'fixtures', 'framework-integration.dsa.ts');
const integrationOut = path.join(__dirname, 'out');
const fixtureRoot = path.join(integrationOut, 'fixture');
const resultPath = path.join(fixtureRoot, 'result.json');
const localEnvPath = path.join(repoRoot, '.env.integration.local');

function fail(message) {
  console.error(`[dazscript integration] ${message}`);
  process.exit(1);
}

function isDazPath(value) {
  return /^[A-Za-z]:[\\/]/.test(value);
}

function normalizeForDaz(value) {
  const normalized = String(value).replace(/\\/g, '/');
  const driveMatch = normalized.match(/\/drive_([A-Za-z])\/(.+)$/);
  if (driveMatch) {
    return `${driveMatch[1].toUpperCase()}:/${driveMatch[2]}`;
  }

  return normalized;
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
    return trimmed.substring(1, trimmed.length - 1);
  }

  return trimmed;
}

function loadLocalEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line || line[0] === '#') continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.substring(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    process.env[key] = unquoteEnvValue(line.substring(separatorIndex + 1));
  }
}

function requireEnv() {
  const missing = [];
  if (!process.env.DAZ_STUDIO_EXE) missing.push('DAZ_STUDIO_EXE');
  if (!process.env.DAZ_TEST_CONTENT_DUF) missing.push('DAZ_TEST_CONTENT_DUF');

  if (missing.length) {
    fail(
      `missing required env: ${missing.join(', ')}\n\n` +
      'Windows example:\n' +
      '$env:DAZ_STUDIO_EXE="C:\\Program Files\\DAZ 3D\\DAZStudio4\\DAZStudio.exe"\n' +
      '$env:DAZ_TEST_CONTENT_DUF="C:\\Users\\Public\\Documents\\My DAZ 3D Library\\People\\Genesis 9\\Genesis 9.duf"\n' +
      'npm run test:integration\n\n' +
      'Linux/Wine example:\n' +
      'WINEPREFIX="$HOME/.local/share/daz-wine/prefix" \\\n' +
      'DAZ_STUDIO_EXE="$WINEPREFIX/drive_c/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe" \\\n' +
      'DAZ_TEST_CONTENT_DUF="$WINEPREFIX/drive_c/users/Public/Documents/My DAZ 3D Library/People/Genesis 9/Genesis 9.duf" \\\n' +
      'npm run test:integration'
    );
  }

  const dazStudioExe = path.resolve(process.env.DAZ_STUDIO_EXE);
  if (!fs.existsSync(dazStudioExe)) {
    fail(`DAZ_STUDIO_EXE does not exist: ${dazStudioExe}`);
  }

  const rawContentPath = process.env.DAZ_TEST_CONTENT_DUF;
  const localContentPath = isDazPath(rawContentPath)
    ? rawContentPath
    : path.resolve(rawContentPath);

  if (!isDazPath(rawContentPath) && !fs.existsSync(localContentPath)) {
    fail(`DAZ_TEST_CONTENT_DUF does not exist: ${localContentPath}`);
  }

  return {
    dazStudioExe,
    contentPath: normalizeForDaz(rawContentPath),
    timeoutMs: Number(process.env.DAZ_TEST_TIMEOUT_MS || 300000)
  };
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: options.stdio || 'inherit',
    timeout: options.timeoutMs
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }

  return result;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function generateFixtureProject() {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(fixtureRoot, 'src'), { recursive: true });

  writeFile(path.join(fixtureRoot, 'package.json'), JSON.stringify({
    private: true,
    scripts: {
      build: 'dazscript build --out-dir ./out'
    },
    dependencies: {
      'dazscript-framework': `file:${repoRoot}`,
      'dazscript-types': '^1.0.1'
    },
    devDependencies: {}
  }, null, 2));

  writeFile(path.join(fixtureRoot, 'dazscript.config.ts'), [
    "import { defineConfig } from 'dazscript-framework/config';",
    '',
    'export default defineConfig({',
    "  scriptsPath: './src',",
    "  outDir: './out',",
    "  defaultMenuPath: '/DazScriptFramework/Integration',",
    "  appDataPath: 'DazScriptFramework/integration-tests',",
    "  bundleName: 'Framework Integration Tests'",
    '});',
    ''
  ].join('\n'));

  writeFile(path.join(fixtureRoot, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES5',
      baseUrl: '.',
      ignoreDeprecations: '5.0',
      lib: ['ES5'],
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      noLib: false,
      useDefineForClassFields: false,
      module: 'ESNext',
      paths: {
        '@dst/*': ['node_modules/dazscript-types/src/types/*'],
        '@dsf/*': ['node_modules/dazscript-framework/src/*']
      },
      declaration: false,
      inlineSourceMap: false,
      removeComments: true,
      preserveConstEnums: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: false,
      strictNullChecks: false,
      strictPropertyInitialization: false,
      noImplicitAny: false,
      strictFunctionTypes: true,
      alwaysStrict: true,
      skipLibCheck: true
    },
    include: [
      'node_modules/dazscript-types/src/types/**/*',
      'src/**/*'
    ]
  }, null, 2));

  fs.copyFileSync(fixtureSource, path.join(fixtureRoot, 'src', 'framework-integration.dsa.ts'));
}

function buildFixtureProject() {
  run('npm', ['install', '--ignore-scripts'], { cwd: fixtureRoot });
  run('npm', ['run', 'build'], { cwd: fixtureRoot });
}

function runDaz(env) {
  const launcherPath = path.join(fixtureRoot, 'out', 'framework-integration.dsa');
  if (!fs.existsSync(launcherPath)) {
    fail(`generated launcher was not found: ${launcherPath}`);
  }

  const args = [
    '-headless',
    '-noPrompt',
    '-scriptArg',
    normalizeForDaz(resultPath),
    '-scriptArg',
    env.contentPath,
    '-script',
    normalizeForDaz(launcherPath)
  ];

  const useWine = process.platform !== 'win32' && /\.exe$/i.test(env.dazStudioExe);
  const command = useWine ? 'wine' : env.dazStudioExe;
  const commandArgs = useWine ? [env.dazStudioExe].concat(args) : args;

  console.log(`[dazscript integration] launching DAZ: ${useWine ? `${command} ${env.dazStudioExe}` : command}`);
  run(command, commandArgs, {
    cwd: fixtureRoot,
    timeoutMs: env.timeoutMs
  });
}

function assertResult() {
  if (!fs.existsSync(resultPath)) {
    fail(`DAZ did not write result JSON: ${resultPath}`);
  }

  let result;
  try {
    result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  }
  catch (error) {
    fail(`could not parse result JSON: ${error}`);
  }

  if (!result || result.ok !== true) {
    const failures = result && result.failures ? result.failures : ['unknown DAZ integration failure'];
    fail(`DAZ integration assertions failed:\n${failures.map((item) => `- ${item}`).join('\n')}\n\nResult: ${resultPath}`);
  }

  console.log(`[dazscript integration] passed: ${resultPath}`);
}

function main() {
  loadLocalEnvFile(localEnvPath);
  const env = requireEnv();
  generateFixtureProject();
  buildFixtureProject();
  runDaz(env);
  assertResult();
}

main();
