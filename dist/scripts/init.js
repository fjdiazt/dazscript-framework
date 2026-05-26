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

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`write ${path.basename(filePath)}`);
  return true;
}

function ensureLine(filePath, line) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';
  const lines = existing.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

  if (lines.includes(line)) {
    return false;
  }

  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(filePath, `${prefix}${line}\n`);
  console.log(`update ${path.basename(filePath)}`);
  return true;
}

function buildConfigContent(options) {
  return `import { defineConfig } from 'dazscript-framework/config';

export default defineConfig({
  scriptsPath: '${options.scriptsPath}',
  outDir: '${options.outDir}',
  defaultMenuPath: '${options.menuPath}',
  appDataPath: '${options.appDataPath}',
  bundleName: '${options.bundleName}',
});
`;
}

function toBundleName(projectName) {
  return projectName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toFixtureName(projectName) {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
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
    'build:encrypted': 'npm run build && npm run encrypt',
    'build:release': 'npm run build -- --log-level warn && npm run encrypt',
    postbuild: 'npm run icons',
    watch: 'dazscript watch',
    encrypt: 'dazscript encrypt --out-dir ./out --daz-studio "C:\\Program Files\\DAZ 3D\\DAZStudio4\\DAZStudio.exe"',
    icons: 'dazscript icons',
    installer: 'dazscript installer',
  };

  writeJson(packageJsonPath, packageJson);
  console.log('update package.json');
}

function updatePackageJsonForIntegration(workdir, fixturePath) {
  const packageJsonPath = path.join(workdir, 'package.json');
  const packageJson = fs.existsSync(packageJsonPath)
    ? readJson(packageJsonPath)
    : { private: true };

  packageJson.scripts = packageJson.scripts || {};
  if (packageJson.scripts['test:integration']) {
    console.log('skip package.json test:integration');
  }
  else {
    packageJson.scripts['test:integration'] = `dazscript integration --fixture ${fixturePath}`;
    writeJson(packageJsonPath, packageJson);
    console.log('update package.json');
  }
}

function buildIntegrationFixtureContent() {
  return `import { action } from '@dsf/core/action'
import { saveToFile } from '@dsf/helpers/file-helper'
import { currentTime, frameToTime, getCurrentFrame, timeToFrame } from '@dsf/helpers/scene-helper'
import { getStringScriptArguments } from '@dsf/helpers/script-helper'

type IntegrationResult = {
    ok: boolean
    project: string
    checks: Record<string, unknown>
    failures: string[]
}

const isNumber = (value: unknown): boolean => typeof value === 'number' && !isNaN(value as number)

action({ text: 'Integration Smoke Test', menuPath: false }, () => {
    const args = getStringScriptArguments()
    const resultPath = args.length > 0 ? args[0] : ''
    const failures: string[] = []
    const frame = getCurrentFrame()
    const time = frameToTime(frame)
    const current = currentTime()
    const roundTripFrame = timeToFrame(time)

    if (!resultPath) {
        failures.push('missing result path argument')
    }
    if (!isNumber(frame)) {
        failures.push('scene-helper getCurrentFrame did not return a number')
    }
    if (current === null || current === undefined) {
        failures.push('scene-helper currentTime returned null or undefined')
    }
    if (roundTripFrame !== frame) {
        failures.push(\`frame/time round trip failed: \${frame} -> \${time} -> \${roundTripFrame}\`)
    }

    const result: IntegrationResult = {
        ok: failures.length === 0,
        project: 'integration-smoke',
        checks: {
            frame,
            time: String(time),
            currentTime: String(current),
            roundTripFrame
        },
        failures
    }

    if (resultPath) {
        saveToFile(resultPath, JSON.stringify(result, null, 2))
    }
})
`;
}

function buildIntegrationReadmeContent(fixturePath) {
  return `# Integration Tests

This project uses the framework DAZ Studio headless integration harness.

Create a local env file from the example for your OS:

\`\`\`bash
cp .env.integration.linux.example .env.integration.local
\`\`\`

\`\`\`powershell
Copy-Item .env.integration.windows.example .env.integration.local
\`\`\`

Then run:

\`\`\`bash
npm run test:integration
\`\`\`

The default smoke fixture is figure-independent:

\`\`\`text
${fixturePath}
\`\`\`

Generated output is written to \`test/integration/out/\` and ignored by git.
`;
}

function buildLinuxEnvExample() {
  return `# Copy this file to .env.integration.local and edit paths for your machine.
# Shell environment variables override values in .env.integration.local.
# DAZ_STUDIO_EXE is required for all integration tests.
# DAZ_TEST_CONTENT_DUF is required only when the fixture or npm script uses --require-content.

WINEPREFIX=/home/your-user/.local/share/daz-wine/prefix
DAZ_STUDIO_EXE=/home/your-user/.local/share/daz-wine/prefix/drive_c/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe
# DAZ_TEST_CONTENT_DUF=/home/your-user/.local/share/daz-wine/prefix/drive_c/users/Public/Documents/My DAZ 3D Library/People/Genesis 9/Genesis 9.duf
DAZ_TEST_TIMEOUT_MS=300000
`;
}

function buildWindowsEnvExample() {
  return `# Copy this file to .env.integration.local and edit paths for your machine.
# Shell environment variables override values in .env.integration.local.
# Forward slashes avoid escaping issues in env files.
# DAZ_STUDIO_EXE is required for all integration tests.
# DAZ_TEST_CONTENT_DUF is required only when the fixture or npm script uses --require-content.

DAZ_STUDIO_EXE=C:/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe
# DAZ_TEST_CONTENT_DUF=C:/Users/Public/Documents/My DAZ 3D Library/People/Genesis 9/Genesis 9.duf
DAZ_TEST_TIMEOUT_MS=300000
`;
}

function initIntegrationTests(workdir, options) {
  const fixtureBaseName = `${toFixtureName(path.basename(workdir))}-smoke.dsa.ts`;
  const fixturePath = `./test/integration/fixtures/${fixtureBaseName}`;
  const localFixturePath = path.join(workdir, fixturePath);

  writeFileIfNeeded(localFixturePath, buildIntegrationFixtureContent(), options.force);
  writeFileIfNeeded(
    path.join(workdir, 'test/integration/README.md'),
    buildIntegrationReadmeContent(fixturePath),
    options.force
  );
  writeFileIfNeeded(
    path.join(workdir, '.env.integration.linux.example'),
    buildLinuxEnvExample(),
    options.force
  );
  writeFileIfNeeded(
    path.join(workdir, '.env.integration.windows.example'),
    buildWindowsEnvExample(),
    options.force
  );
  updatePackageJsonForIntegration(workdir, fixturePath);
  ensureLine(path.join(workdir, '.gitignore'), 'test/integration/out/');
  ensureLine(path.join(workdir, '.gitignore'), '.env.integration.local');
}

function initProject(workdir, rawOptions) {
  const projectName = path.basename(workdir);
  const options = {
    force: Boolean(rawOptions.force),
    menuPath: normalizePath(rawOptions.menuPath, '/MyScripts'),
    scriptsPath: normalizePath(rawOptions.scriptsPath, './src'),
    outDir: normalizePath(rawOptions.outDir, './out'),
    appDataPath: normalizePath(rawOptions.appDataPath, `YourName/${projectName}`),
    bundleName: toBundleName(projectName),
    integrationTests: Boolean(rawOptions.integrationTests),
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

  if (options.integrationTests) {
    initIntegrationTests(workdir, options);
  }
}

module.exports = {
  initIntegrationTests,
  initProject,
};
