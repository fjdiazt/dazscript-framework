# DazScript Framework

The **DazScript Framework** is a TypeScript-based framework for writing Daz Studio scripts. It provides all the advantages of a typed language such as autocompletion, error checking, and method parameter documentation and hinting. The framework also includes a set of dialog helpers for rapid UI development.

## Benefits

- **Autocompletion:** Take advantage of IDE autocompletion for faster and more efficient script development.
- **Error Checking:** Catch potential errors early in the development process with TypeScript's static analysis.
- **Method Documentation & Hinting:** Get contextual documentation and hints for methods, classes, and parameters.

## Features

- TypeScript support with full IntelliSense.
- A powerful set of decorators and helper methods for building interactive scripts.
- Easy integration with Daz Studio for quick script deployment.

## Installation

To install the **DazScript Framework**, run the following command:

```bash
npm install dazscript-framework
```

## Setup

After installing the package, you will need to configure a few files for your project.

1. **babel.config.js**

   Create the file and add the following content:

   ```javascript
   const sharedBabelConfig = require('dazscript-framework/babel');

   module.exports = {
     ...sharedBabelConfig,
     presets: [...sharedBabelConfig.presets],
     plugins: [...sharedBabelConfig.plugins],
   };
   ```

2. **package.json**

   Add the following scripts to your package.json:

   ```json
   "scripts": {
       "prebuild": "npm run installer",
       "build": "webpack --env outputPath=./out",
       "postbuild": "npm run icons",
       "watch": "webpack --env outputPath=./out --watch",
       "icons": "copyfiles -u 1 src/**/*.png out/",
       "installer": "node ./node_modules/dazscript-framework/dist/scripts/install-generator.js -p ./src/scripts -m /My Scripts"
   }
   ```

3. **tsconfig.json**

   Create the file and add the following content:

   ```json
   {
     "extends": "./node_modules/dazscript-framework/tsconfig.json",
     "compilerOptions": {
       "baseUrl": "./",
       "paths": {
         "shared/*": ["src/shared/*"],
         "@dst/*": ["node_modules/dazscript-types/*"],
         "@dsf/*": ["node_modules/dazscript-framework/src/*"]
       }
     },
     "include": ["node_modules/dazscript-types/**/*", "src/**/*"]
   }
   ```

4. **webpack.config.js**
   Create the file and add the following content:

   ```javascript
   const sharedWebpackConfig = require('dazscript-framework/webpack');

   module.exports = (env, argv) => {
     const sharedConfig = sharedWebpackConfig(env, argv);

     return {
       ...sharedConfig,
       // You can override or add more customizations here if needed
     };
   };
   ```

## Usage
