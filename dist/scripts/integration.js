'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const defaultTimeoutMs = 300000;

function isDazPath(value) {
  return /^[A-Za-z]:[\\/]/.test(String(value || ''));
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
  const trimmed = String(value || '').trim();
  if (trimmed.length < 2) return trimmed;

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
    return trimmed.substring(1, trimmed.length - 1);
  }

  return trimmed;
}

function loadEnvFile(envPath, targetEnv) {
  if (!envPath || !fs.existsSync(envPath)) return false;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line[0] === '#') continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.substring(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (targetEnv[key] !== undefined) continue;

    targetEnv[key] = unquoteEnvValue(line.substring(separatorIndex + 1));
  }

  return true;
}

function assertRequiredFile(label, filePath, allowDazPath) {
  if (!filePath) {
    throw new Error(`missing required env: ${label}`);
  }

  if (allowDazPath && isDazPath(filePath)) {
    return filePath;
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${label} does not exist: ${resolvedPath}`);
  }

  return resolvedPath;
}

function resolveIntegrationOptions(cwd, rawOptions, env) {
  const options = rawOptions || {};
  const projectRoot = path.resolve(cwd || process.cwd());
  const envFile = path.resolve(projectRoot, options.envFile || '.env.integration.local');
  const fixturePath = options.fixture
    ? path.resolve(projectRoot, options.fixture)
    : '';

  if (!fixturePath) {
    throw new Error('missing required option: --fixture <path>');
  }
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`fixture file does not exist: ${fixturePath}`);
  }

  const dazStudioExe = assertRequiredFile(
    'DAZ_STUDIO_EXE',
    options.dazStudio || env.DAZ_STUDIO_EXE,
    false
  );

  const rawContentPath = options.contentDuf || env.DAZ_TEST_CONTENT_DUF || '';
  if (options.requireContent) {
    assertRequiredFile('DAZ_TEST_CONTENT_DUF', rawContentPath, true);
  }
  else if (rawContentPath && !isDazPath(rawContentPath) && !fs.existsSync(path.resolve(rawContentPath))) {
    throw new Error(`DAZ_TEST_CONTENT_DUF does not exist: ${path.resolve(rawContentPath)}`);
  }

  const timeoutMs = Number(options.timeoutMs || env.DAZ_TEST_TIMEOUT_MS || defaultTimeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`invalid timeout: ${options.timeoutMs || env.DAZ_TEST_TIMEOUT_MS}`);
  }

  const outDir = path.resolve(projectRoot, options.outDir || './test/integration/out');
  const fixtureName = path.basename(fixturePath).replace(/\.dsa\.ts$/i, '').replace(/\.ts$/i, '');
  const fixtureRoot = path.join(outDir, 'fixture');
  const resultPath = path.join(fixtureRoot, 'result.json');
  const frameworkRoot = path.resolve(__dirname, '..', '..');

  return {
    projectRoot,
    frameworkRoot,
    envFile,
    fixturePath,
    fixtureName,
    outDir,
    fixtureRoot,
    resultPath,
    dazStudioExe,
    contentPath: rawContentPath ? normalizeForDaz(rawContentPath) : '',
    requireContent: Boolean(options.requireContent),
    timeoutMs,
    appDataPath: options.appDataPath || 'DazScriptFramework/integration-tests',
    bundleName: options.bundleName || 'Integration Test Fixture',
    env,
  };
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: options.stdio || 'inherit',
    timeout: options.timeoutMs,
  });

  if (result.error) {
    if (result.error.code === 'ETIMEDOUT') {
      throw new Error(`${command} timed out after ${options.timeoutMs}ms`);
    }
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

function buildFixtureProject(options) {
  fs.rmSync(options.fixtureRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(options.fixtureRoot, 'src'), { recursive: true });

  writeFile(path.join(options.fixtureRoot, 'package.json'), JSON.stringify({
    private: true,
    scripts: {
      build: 'dazscript build --out-dir ./out',
    },
    dependencies: {
      'dazscript-framework': `file:${options.frameworkRoot}`,
      'dazscript-types': '^1.0.1',
    },
    devDependencies: {},
  }, null, 2));

  writeFile(path.join(options.fixtureRoot, 'dazscript.config.ts'), [
    "import { defineConfig } from 'dazscript-framework/config';",
    '',
    'export default defineConfig({',
    "  scriptsPath: './src',",
    "  outDir: './out',",
    "  defaultMenuPath: '/DazScriptFramework/Integration',",
    `  appDataPath: '${options.appDataPath}',`,
    `  bundleName: '${options.bundleName}'`,
    '});',
    '',
  ].join('\n'));

  writeFile(path.join(options.fixtureRoot, 'tsconfig.json'), JSON.stringify({
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
        '@dsf/*': ['node_modules/dazscript-framework/src/*'],
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
      skipLibCheck: true,
    },
    include: [
      'node_modules/dazscript-types/src/types/**/*',
      'src/**/*',
    ],
  }, null, 2));

  fs.copyFileSync(options.fixturePath, path.join(options.fixtureRoot, 'src', `${options.fixtureName}.dsa.ts`));
  run('npm', ['install', '--ignore-scripts'], { cwd: options.fixtureRoot });
  run('npm', ['run', 'build'], { cwd: options.fixtureRoot });
}

function runDazFixture(options) {
  const launcherPath = path.join(options.fixtureRoot, 'out', `${options.fixtureName}.dsa`);
  if (!fs.existsSync(launcherPath)) {
    throw new Error(`generated launcher was not found: ${launcherPath}`);
  }

  const dazArgs = [
    '-headless',
    '-noPrompt',
    '-scriptArg',
    normalizeForDaz(options.resultPath),
  ];

  if (options.contentPath) {
    dazArgs.push('-scriptArg', options.contentPath);
  }

  dazArgs.push('-script', normalizeForDaz(launcherPath));

  const useWine = process.platform !== 'win32' && /\.exe$/i.test(options.dazStudioExe);
  const command = useWine ? 'wine' : options.dazStudioExe;
  const commandArgs = useWine ? [options.dazStudioExe].concat(dazArgs) : dazArgs;

  console.log(`[dazscript integration] launching DAZ: ${useWine ? `${command} ${options.dazStudioExe}` : command}`);
  run(command, commandArgs, {
    cwd: options.fixtureRoot,
    env: options.env,
    timeoutMs: options.timeoutMs,
  });
}

function readIntegrationResult(resultPath) {
  if (!fs.existsSync(resultPath)) {
    throw new Error(`DAZ did not write result JSON: ${resultPath}`);
  }

  let result;
  try {
    result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  }
  catch (error) {
    throw new Error(`could not parse result JSON: ${error}`);
  }

  if (!result || result.ok !== true) {
    const failures = result && result.failures ? result.failures : ['unknown DAZ integration failure'];
    throw new Error(`DAZ integration assertions failed:\n${failures.map((item) => `- ${item}`).join('\n')}\n\nResult: ${resultPath}`);
  }

  return result;
}

async function runIntegration(rawOptions, injectedEnv, cwd) {
  const env = { ...(injectedEnv || process.env) };
  const projectRoot = path.resolve(cwd || process.cwd());
  const envFile = path.resolve(projectRoot, (rawOptions && rawOptions.envFile) || '.env.integration.local');
  loadEnvFile(envFile, env);

  const options = resolveIntegrationOptions(projectRoot, rawOptions, env);
  buildFixtureProject(options);
  runDazFixture(options);
  const result = readIntegrationResult(options.resultPath);
  console.log(`[dazscript integration] passed: ${options.resultPath}`);
  return result;
}

module.exports = {
  loadEnvFile,
  normalizeForDaz,
  readIntegrationResult,
  resolveIntegrationOptions,
  buildFixtureProject,
  runDazFixture,
  runIntegration,
};
