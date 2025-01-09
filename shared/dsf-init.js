const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(process.cwd(), 'package.json');

const newScripts = {
  build: 'webpack',
  watch: 'webpack --watch',
  icons: 'copyfiles -u 1 src/**/*.png dist/',
  installers:
    'node ./node_modules/dazscript-framework/shared/install-generator.js -p ./src/scripts -m /My Scripts',
};

fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json', err);
    return;
  }

  const packageJson = JSON.parse(data);

  // If scripts already exist, merge them
  packageJson.scripts = packageJson.scripts || {};
  Object.assign(packageJson.scripts, newScripts);

  // Write the updated package.json back
  fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), (err) => {
    if (err) {
      console.error('Error writing package.json', err);
    } else {
      console.log('Scripts successfully added to package.json');
    }
  });
});
