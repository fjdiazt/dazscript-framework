'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`copy ${path.relative(process.cwd(), targetPath)}`);
}

function resolveAssetPath(rootPath, configuredPath, field) {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedPath = path.resolve(resolvedRoot, configuredPath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);
  if (path.isAbsolute(configuredPath) || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`[dazscript assets] Asset ${field} path must stay inside its allowed root: ${configuredPath}`);
  }
  return resolvedPath;
}

function copyAssets(workdir, outDir, assets) {
  (assets || []).forEach((asset) => {
    const sourcePath = resolveAssetPath(workdir, asset.from, 'from');
    const targetPath = resolveAssetPath(outDir, asset.to, 'to');
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`[dazscript assets] Required asset not found: ${asset.from}`);
    }
    copyFile(sourcePath, targetPath);
  });
}

function copyIcons(workdir, options) {
  const sourceRoot = path.resolve(workdir, 'src');
  const outDir = path.resolve(workdir, options.outDir || './out');
  const pattern = path.join(sourceRoot, '**/*.png').replace(/\\/g, '/');
  const files = globSync(pattern);

  files.forEach((filePath) => {
    const relativePath = path.relative(sourceRoot, filePath);
    const outputRelativePath = relativePath.endsWith('.dsa.png')
      ? `${relativePath.slice(0, -'.dsa.png'.length)}.png`
      : relativePath;
    copyFile(filePath, path.join(outDir, outputRelativePath));
  });
  copyAssets(workdir, outDir, options.assets);
}

module.exports = {
  copyIcons,
};
