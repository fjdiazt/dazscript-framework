const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const nameofActionFunction = 'action';

function getPartialPath(filePath) {
  const fileInfo = path.parse(filePath);
  const dir = fileInfo.dir.replace('/src', '').replace(/^\.\//, '');
  return dir ? `${dir}/${fileInfo.name}` : fileInfo.name;
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

function literalValue(node) {
  if (!node) {
    return undefined;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    if (node.operator === ts.SyntaxKind.MinusToken) {
      return -Number(node.operand.text);
    }

    if (node.operator === ts.SyntaxKind.PlusToken) {
      return Number(node.operand.text);
    }
  }

  return undefined;
}

function objectLiteralToObject(node) {
  if (!node || !ts.isObjectLiteralExpression(node)) {
    return null;
  }

  const result = {};

  node.properties.forEach((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return;
    }

    const name = ts.isIdentifier(property.name)
      ? property.name.text
      : ts.isStringLiteral(property.name)
        ? property.name.text
        : null;

    if (!name) {
      return;
    }

    const value = literalValue(property.initializer);
    if (value !== undefined) {
      result[name] = value;
    }
  });

  return result;
}

function getCallName(expression) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function findTopLevelActionCall(content, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement)) {
      continue;
    }

    const expression = statement.expression;
    if (!ts.isCallExpression(expression)) {
      continue;
    }

    if (getCallName(expression.expression) !== nameofActionFunction) {
      continue;
    }

    return expression;
  }

  return null;
}

function processScript(filePath, container, defaultMenuPath) {
  const fileInfo = path.parse(filePath);
  const content = fs.readFileSync(filePath, 'utf-8').toString();
  const actionCall = findTopLevelActionCall(content, filePath);

  if (!actionCall) {
    return;
  }

  const decorator = objectLiteralToObject(actionCall.arguments[0]) ?? {};

  const script = {
    name: null,
    text: fileInfo.name.replace('.dsa', ''),
    filePath:
      decorator.bundle === undefined
        ? getPartialPath(filePath)
        : fileInfo.name.replace('.ts', ''),
    menuPath: (() => {
      const relativeDir = path.parse(getPartialPath(filePath)).dir;
      return relativeDir && relativeDir !== '.'
        ? `${defaultMenuPath}${relativeDir}`
        : defaultMenuPath.replace(/\/$/, '');
    })(),
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

  console.log(`Adding script: ${script.text}`, script);
  container.scripts.push(script);

  if (decorator.bundle !== undefined) {
    let packageInstallerFilePath = `Install.dsa.ts`;
    let packageUninstallerFilePath = `Uninstall.dsa.ts`;

    if (decorator.bundle !== true) {
      packageInstallerFilePath = `Install ${decorator.bundle}.dsa.ts`;
      packageUninstallerFilePath = `Uninstall ${decorator.bundle}.dsa.ts`;
    }

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
}

function processScripts(paths, container, defaultMenuPath) {
  paths.forEach((filePath) => {
    console.log(`Processing ${filePath}`);
    processScript(filePath, container, defaultMenuPath);
  });
}

function generateInstallerFiles(workdir, options) {
  const scriptsPath = options.scriptsPath.endsWith('/')
    ? options.scriptsPath
    : `${options.scriptsPath}/`;
  const defaultMenuPath = options.defaultMenuPath.endsWith('/')
    ? options.defaultMenuPath
    : `${options.defaultMenuPath}/`;
  const container = { scripts: [] };
  const matches = glob.sync(`${scriptsPath}/**/*.dsa.ts`, { cwd: workdir });

  processScripts(matches, container, defaultMenuPath);

  container.scripts = container.scripts.sort((a, b) => {
    const aKey = a.menuPath + a.filePath;
    const bKey = b.menuPath + b.filePath;
    return compareStrings(aKey, bKey);
  });

  const installerScriptContent = generateInstallerTemplate(
    JSON.stringify(container.scripts, null, 4)
  );
  fs.writeFileSync(path.join(workdir, 'src', 'Install.dsa.ts'), installerScriptContent);

  const uninstallerScriptContent = generateUninstallerTemplate(
    JSON.stringify(container.scripts, null, 4)
  );
  fs.writeFileSync(
    path.join(workdir, 'src', 'Uninstall.dsa.ts'),
    uninstallerScriptContent
  );
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    scriptsPath: './src',
    defaultMenuPath: 'My Scripts',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--scripts-path' || arg === '-p') {
      options.scriptsPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--menu-path' || arg === '--defaultMenuPath' || arg === '-m') {
      options.defaultMenuPath = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  generateInstallerFiles(process.cwd(), options);
}

module.exports = {
  generateInstallerFiles,
};
