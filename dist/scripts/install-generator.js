const tsFileParser = require('ts-file-parser');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { program } = require('commander');

program
  .requiredOption(
    '-p, --scriptsPath <path>',
    'Specify the path to your scripts'
  )
  .option(
    '-m, --defaultMenuPath [path]',
    'Specify the default menu path',
    'My Scripts'
  )
  .parse(process.argv);
let options = program.opts();

const nameofActionDecorator = 'action';

const scriptsPath = options.scriptsPath.endsWith('/')
  ? options.scriptsPath
  : options.scriptsPath + '/';
const defaultMenuPath = options.defaultMenuPath.endsWith('/')
  ? options.defaultMenuPath
  : options.defaultMenuPath + '/';

const container = { scripts: [] };

function getPartialPath(filePath) {
  const fileInfo = path.parse(filePath);
  const dir = fileInfo.dir.replace('/src', '').replace(/^\.\//, '');
  return `${dir}/${fileInfo.name}`;
}

function compareStrings(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function stringOrDefault(str, defaultValue) {
  return str !== undefined && str !== null && str !== '' ? str : defaultValue;
}

function generateInstallerTemplate(data) {
  return `
import { installCustomActions as install } from '@dsf/helpers/custom-action-helper';

install(${data});
`;
}

function generateUninstallerTemplate(data) {
  return `
import { uninstallCustomActions as uninstall } from '@dsf/helpers/custom-action-helper';

uninstall(${data});
`;
}

function processScript(filePath) {
  const fileInfo = path.parse(filePath);
  const content = fs.readFileSync(filePath, 'utf-8').toString();
  const json = tsFileParser.parseStruct(content, {}, filePath);

  json.classes.forEach((cls) => {
    const actionDecorator = cls.decorators.find(
      (d) => d.name === nameofActionDecorator
    );

    if (!actionDecorator) return;

    const decorator = actionDecorator.arguments[0] ?? {};

    const script = {
      name: null,
      text: fileInfo.name.replace('.dsa', ''),
      filePath:
        decorator.bundle === undefined
          ? getPartialPath(filePath)
          : fileInfo.name.replace('.ts', ''),
      menuPath: `${defaultMenuPath}${path.parse(getPartialPath(filePath)).dir}`,
      description: fileInfo.name.replace('.dsa', ''),
      group: stringOrDefault(decorator.group, undefined),
      shortcut: stringOrDefault(decorator.shortcut),
      toolbar: stringOrDefault(decorator.toolbar, undefined),
    };

    const icon = filePath.replace('.ts', '.png');
    if (fs.existsSync(icon)) {
      script.icon =
        decorator.bundle === undefined
          ? `${getPartialPath(filePath)}.png`
          : fileInfo.name.replace('.dsa', '.dsa.png');
    }

    if (actionDecorator) {
      script.text = stringOrDefault(decorator.text, script.text);
      if (typeof decorator.menuPath === 'boolean') {
        script.menuPath = decorator.menuPath === true ? script.menuPath : '';
      } else {
        script.menuPath = stringOrDefault(decorator.menuPath, script.menuPath);
      }
      script.menuPath = script.menuPath.replace(
        '#{defaultMenuPath}',
        defaultMenuPath
      );
      script.shortcut = decorator.shortcut;
    }

    console.log(`Adding script: ${script.text}`, script);
    container.scripts.push(script);

    // Check if the decorator has a "bundle" property
    if (decorator.bundle !== undefined) {
      let packageInstallerFilePath = `Install.dsa.ts`;
      let packageUninstallerFilePath = `Uninstall.dsa.ts`;

      if (decorator.bundle !== true) {
        // If decorator.bundle is a string, use it as the bundle file name
        packageInstallerFilePath = `Install ${decorator.bundle}.dsa.ts`;
        packageUninstallerFilePath = `Uninstall ${decorator.bundle}.dsa.ts`;
      }

      // Generate a separate file with the specified or default name
      let bundleScriptContent = generateInstallerTemplate(
        JSON.stringify(container.scripts, null, 4)
      );
      let bundleScriptFilePath = path.join(
        path.parse(filePath).dir,
        packageInstallerFilePath
      );
      fs.writeFileSync(bundleScriptFilePath, bundleScriptContent);

      bundleScriptContent = generateUninstallerTemplate(
        JSON.stringify(container.scripts, null, 4)
      );
      bundleScriptFilePath = path.join(
        path.parse(filePath).dir,
        packageUninstallerFilePath
      );
      fs.writeFileSync(bundleScriptFilePath, bundleScriptContent);
    }
  });
}

function processScripts(paths) {
  paths.forEach((filePath) => {
    console.log(`Processing ${filePath}`);
    processScript(filePath);
  });
}

function generate() {
  glob(`${scriptsPath}/**/*.dsa.ts`, function (err, paths) {
    if (err) {
      console.error('Error while globbing:', err);
      return;
    }

    processScripts(paths);

    container.scripts = container.scripts.sort((a, b) => {
      const aKey = a.menuPath + a.filePath;
      const bKey = b.menuPath + b.filePath;
      return compareStrings(aKey, bKey);
    });

    // Generate the InstallerScript class and call install function
    const installerScriptContent = generateInstallerTemplate(
      JSON.stringify(container.scripts, null, 4)
    );
    let outputFilePath = './src/Install.dsa.ts';
    fs.writeFileSync(outputFilePath, installerScriptContent);

    const uninstallerScriptContent = generateUninstallerTemplate(
      JSON.stringify(container.scripts, null, 4)
    );
    outputFilePath = './src/Uninstall.dsa.ts';
    fs.writeFileSync(outputFilePath, uninstallerScriptContent);
  });
}

// Call the generate function at the end of the script
generate();
