'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function toDazPath(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

function findImplementationScripts(dir) {
  const scripts = [];

  function visit(currentDir) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name === 'script.dsa' &&
        path.basename(path.dirname(entryPath)) !== 'lib' &&
        entryPath.split(path.sep).includes('lib')
      ) {
        scripts.push(entryPath);
      }
    }
  }

  visit(dir);
  return scripts;
}

function makeConverterScript() {
  return [
    '(function(){',
    '    function log(message) { print("[dazscript encrypt] " + message); }',
    '    function fail(message) {',
    '        print("[dazscript encrypt] ERROR " + message);',
    '        App.quit();',
    '    }',
    '    function splitList(value) {',
    '        if (!value) return [];',
    '        return String(value).split("|");',
    '    }',
    '    function removeSourceFile(sourcePath) {',
    '        var sourceFile = new DzFile(sourcePath);',
    '        if (sourceFile.exists() && !sourceFile.remove()) {',
    '            log("warning: encrypted but could not delete " + sourcePath);',
    '        }',
    '        sourceFile.deleteLater();',
    '    }',
    '    var args = App.scriptArgs;',
    '    var sourceList = splitList(args[0]);',
    '    var deleteSources = String(args[1]) == "delete";',
    '    if (!sourceList.length) {',
    '        log("no implementation scripts found");',
    '        App.quit();',
    '        return;',
    '    }',
    '    var failures = 0;',
    '    for (var i = 0; i < sourceList.length; i += 1) {',
    '        var sourcePath = sourceList[i];',
    '        var destPath = sourcePath.replace(/\\.dsa$/i, ".dse");',
    '        var script = new DzScript();',
    '        log("encrypt " + sourcePath);',
    '        if (!script.loadFromFile(sourcePath)) {',
    '            failures += 1;',
    '            log("failed to load " + sourcePath);',
    '            script.deleteLater();',
    '            continue;',
    '        }',
    '        if (!script.checkSyntax()) {',
    '            failures += 1;',
    '            log("syntax error in " + sourcePath + " line " + script.errorLine() + ": " + script.errorMessage());',
    '            script.deleteLater();',
    '            continue;',
    '        }',
    '        var writeError = script.saveFile(destPath, DzScript.EncDAZScriptFile);',
    '        script.deleteLater();',
    '        if (Number(writeError) != 0) {',
    '            failures += 1;',
    '            log("failed to save " + destPath + " error=" + writeError);',
    '            continue;',
    '        }',
    '        if (deleteSources) {',
    '            removeSourceFile(sourcePath);',
    '        }',
    '        log("wrote " + destPath);',
    '    }',
    '    if (failures) {',
    '        fail(String(failures) + " script(s) failed");',
    '        return;',
    '    }',
    '    log("complete");',
    '    App.quit();',
    '})();',
    '',
  ].join('\n');
}

function runEncrypt(workdir, options) {
  if (!options.dazStudio) {
    throw new Error('Missing required option: --daz-studio <path>');
  }

  const outDir = path.resolve(workdir, options.outDir || './out');
  const dazStudioPath = path.resolve(workdir, options.dazStudio);

  if (!fs.existsSync(dazStudioPath)) {
    throw new Error(`Daz Studio executable not found: ${dazStudioPath}`);
  }

  if (!fs.existsSync(outDir)) {
    throw new Error(`Output directory not found: ${outDir}`);
  }

  const implementationScripts = findImplementationScripts(outDir);
  if (!implementationScripts.length) {
    console.log(`[dazscript encrypt] no implementation scripts found under ${outDir}`);
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dazscript-encrypt-'));
  const converterPath = path.join(tempDir, 'encrypt-output.dsa');
  fs.writeFileSync(converterPath, makeConverterScript(), 'utf8');

  const args = [
    '-headless',
    '-noPrompt',
    '-scriptArg',
    implementationScripts.map(toDazPath).join('|'),
    '-scriptArg',
    options.keepSource ? 'keep' : 'delete',
    toDazPath(converterPath),
  ];

  console.log(`[dazscript encrypt] encrypting ${implementationScripts.length} implementation script(s)`);
  const result = spawnSync(dazStudioPath, args, {
    encoding: 'utf8',
    stdio: 'inherit',
    timeout: options.timeoutMs || 300000,
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Daz Studio exited with code ${result.status}`);
  }

  const missingOutputs = implementationScripts.filter((scriptPath) => {
    const encryptedPath = scriptPath.replace(/\.dsa$/i, '.dse');
    return !fs.existsSync(encryptedPath);
  });

  if (missingOutputs.length) {
    throw new Error(
      'Daz Studio did not produce encrypted output for:\n' +
        missingOutputs.map((scriptPath) => `  ${scriptPath}`).join('\n')
    );
  }
}

module.exports = {
  runEncrypt,
};
