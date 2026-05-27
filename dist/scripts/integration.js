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

function resolveHeadlessOptions(cwd, rawOptions, env, defaults) {
  const options = rawOptions || {};
  const projectRoot = path.resolve(cwd || process.cwd());
  const envFile = path.resolve(projectRoot, options.envFile || defaults.envFile);
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

  const timeoutMs = Number(options.timeoutMs || env[defaults.timeoutEnv] || env.DAZ_TEST_TIMEOUT_MS || defaultTimeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`invalid timeout: ${options.timeoutMs || env[defaults.timeoutEnv] || env.DAZ_TEST_TIMEOUT_MS}`);
  }

  const outDir = path.resolve(projectRoot, options.outDir || defaults.outDir);
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
    appDataPath: options.appDataPath || defaults.appDataPath,
    bundleName: options.bundleName || defaults.bundleName,
    commandName: defaults.commandName,
    env,
  };
}

function resolveIntegrationOptions(cwd, rawOptions, env) {
  return resolveHeadlessOptions(cwd, rawOptions, env, {
    commandName: 'integration',
    envFile: '.env.integration.local',
    timeoutEnv: 'DAZ_TEST_TIMEOUT_MS',
    outDir: './test/integration/out',
    appDataPath: 'DazScriptFramework/integration-tests',
    bundleName: 'Integration Test Fixture',
  });
}

function resolveProbeOptions(cwd, rawOptions, env) {
  return resolveHeadlessOptions(cwd, rawOptions, env, {
    commandName: 'probe',
    envFile: '.env.probe.local',
    timeoutEnv: 'DAZ_PROBE_TIMEOUT_MS',
    outDir: './probes/out',
    appDataPath: 'DazScriptFramework/probes',
    bundleName: 'Probe Fixture',
  });
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

function getNpmInvocation(args, platform) {
  const npmArgs = args || [];
  if ((platform || process.platform) !== 'win32') {
    return { command: 'npm', args: npmArgs };
  }

  const npmCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (fs.existsSync(npmCliPath)) {
    return { command: process.execPath, args: [npmCliPath].concat(npmArgs) };
  }

  return { command: 'npm.cmd', args: npmArgs };
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

const fixtureBuildDependencies = [
  '@babel/core',
  '@babel/plugin-proposal-class-properties',
  '@babel/plugin-proposal-decorators',
  '@babel/plugin-transform-arrow-functions',
  '@babel/plugin-transform-block-scoping',
  '@babel/plugin-transform-class-properties',
  '@babel/plugin-transform-private-methods',
  '@babel/plugin-transform-private-property-in-object',
  '@babel/preset-env',
  '@babel/preset-typescript',
  'babel-core',
  'babel-loader',
  'babel-plugin-transform-class-properties',
  'babel-plugin-transform-typescript-metadata',
  'glob',
  'ts-loader',
  'tsconfig-paths-webpack-plugin',
  'typescript',
  'webpack',
];

function getFixtureBuildDependencies(frameworkRoot) {
  const frameworkPackageJson = JSON.parse(
    fs.readFileSync(path.join(frameworkRoot, 'package.json'), 'utf8')
  );
  const availableDependencies = {
    ...(frameworkPackageJson.dependencies || {}),
    ...(frameworkPackageJson.devDependencies || {}),
  };

  return fixtureBuildDependencies.reduce((result, dependencyName) => {
    const version = availableDependencies[dependencyName];
    if (version) {
      result[dependencyName] = version;
    }
    return result;
  }, {});
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
    devDependencies: getFixtureBuildDependencies(options.frameworkRoot),
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
  const npmInstall = getNpmInvocation(['install', '--ignore-scripts']);
  run(npmInstall.command, npmInstall.args, { cwd: options.fixtureRoot });
  const npmBuild = getNpmInvocation(['run', 'build']);
  run(npmBuild.command, npmBuild.args, { cwd: options.fixtureRoot });
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

  console.log(`[dazscript ${options.commandName || 'integration'}] launching DAZ: ${useWine ? `${command} ${options.dazStudioExe}` : command}`);
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

function readProbeResult(resultPath) {
  if (!fs.existsSync(resultPath)) {
    throw new Error(`DAZ did not write result JSON: ${resultPath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  }
  catch (error) {
    throw new Error(`could not parse result JSON: ${error}`);
  }
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

async function runProbe(rawOptions, injectedEnv, cwd) {
  const env = { ...(injectedEnv || process.env) };
  const projectRoot = path.resolve(cwd || process.cwd());
  const envFile = path.resolve(projectRoot, (rawOptions && rawOptions.envFile) || '.env.probe.local');
  loadEnvFile(envFile, env);

  const options = resolveProbeOptions(projectRoot, rawOptions, env);
  buildFixtureProject(options);
  runDazFixture(options);
  const result = readProbeResult(options.resultPath);
  console.log(`[dazscript probe] result: ${options.resultPath}`);
  return result;
}

module.exports = {
  loadEnvFile,
  normalizeForDaz,
  getNpmInvocation,
  getFixtureBuildDependencies,
  readIntegrationResult,
  readProbeResult,
  resolveIntegrationOptions,
  resolveProbeOptions,
  buildFixtureProject,
  runDazFixture,
  runIntegration,
  runProbe,
};
