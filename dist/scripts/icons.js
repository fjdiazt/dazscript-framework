'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`copy ${path.relative(process.cwd(), targetPath)}`);
}

function copyIcons(workdir, options) {
  const sourceRoot = path.resolve(workdir, 'src');
  const outDir = path.resolve(workdir, options.outDir || './out');
  const pattern = path.join(sourceRoot, '**/*.png').replace(/\\/g, '/');
  const files = glob.sync(pattern);

  files.forEach((filePath) => {
    const relativePath = path.relative(sourceRoot, filePath);
    copyFile(filePath, path.join(outDir, relativePath));
  });
}

module.exports = {
  copyIcons,
};
