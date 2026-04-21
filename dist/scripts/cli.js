#!/usr/bin/env node
'use strict';

const path = require('path');
const readline = require('readline');
const { runWebpack } = require('./build');
const { loadConfig } = require('./config-loader');
const { copyIcons } = require('./icons');
const { generateInstallerFiles } = require('./install-generator');
const { initProject } = require('./init');

function printHelp() {
  console.log(`dazscript <command> [options]

Commands:
  init                Scaffold a DazScript project in the current directory
  build               Build DazScript files
  watch               Build and watch DazScript files
  icons               Copy png assets into the output directory
  installer           Generate Install.dsa.ts and Uninstall.dsa.ts

Options for init:
  --menu-path <path>    Default menu path. Default: /MyScripts
  --scripts-path <path> Source directory to scan. Default: ./src
  --out-dir <path>      Build output directory. Default: ./out
  --app-data-path <path> AppData namespace used by launcher fallbacks. Example: Author/Product
  --force               Overwrite generated files
  --help                Show this message
`);
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function resolveInitOptions(workdir, options) {
  if (options.appDataPath) {
    return options;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return options;
  }

  const defaultProductName = path.basename(workdir);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let author = '';
    while (!author) {
      const answer = await askQuestion(
        rl,
        'AppData author namespace (for example Vholf3D): '
      );
      author = answer.trim();
    }

    const productAnswer = await askQuestion(
      rl,
      `AppData product namespace [${defaultProductName}]: `
    );
    const product = productAnswer.trim() || defaultProductName;

    return {
      ...options,
      appDataPath: `${author}/${product}`,
    };
  } finally {
    rl.close();
  }
}

function parseOptions(args, defaults) {
  const options = { ...defaults };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--menu-path') {
      options.menuPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--scripts-path') {
      options.scriptsPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--out-dir') {
      options.outDir = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--app-data-path') {
      options.appDataPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--file') {
      options.file = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--help') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function getResolvedOptions(workdir, cliOptions) {
  const { config } = loadConfig(workdir);

  const options = {
    ...config,
    ...cliOptions,
  };

  if (!options.menuPath && options.defaultMenuPath) {
    options.menuPath = options.defaultMenuPath;
  }

  return options;
}

async function main(argv) {
  const [, , command, ...rest] = argv;
  const workdir = process.cwd();

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const options = parseOptions(rest, {
    force: false,
    menuPath: undefined,
    scriptsPath: undefined,
    outDir: undefined,
    appDataPath: undefined,
    file: undefined,
  });

  if (options.help) {
    printHelp();
    return;
  }

  const commandOptions =
    command === 'init'
      ? await resolveInitOptions(workdir, options)
      : options;
  const resolvedOptions = getResolvedOptions(workdir, options);
  if (commandOptions !== options) {
    Object.assign(resolvedOptions, commandOptions);
  }
  resolvedOptions.menuPath = resolvedOptions.menuPath || '/MyScripts';
  resolvedOptions.scriptsPath = resolvedOptions.scriptsPath || './src';
  resolvedOptions.outDir = resolvedOptions.outDir || './out';

  if (command === 'init') {
    initProject(workdir, resolvedOptions);
    return;
  }

  if (command === 'build') {
    await runWebpack(workdir, resolvedOptions);
    return;
  }

  if (command === 'watch') {
    await runWebpack(workdir, { ...resolvedOptions, watch: true });
    return;
  }

  if (command === 'icons') {
    copyIcons(workdir, resolvedOptions);
    return;
  }

  if (command === 'installer') {
    generateInstallerFiles(workdir, {
      scriptsPath: resolvedOptions.scriptsPath,
      defaultMenuPath: resolvedOptions.menuPath,
    });
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  Promise.resolve(main(process.argv)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
