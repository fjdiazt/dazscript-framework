const path = require('path');
const glob = require('glob');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, argv) => {
  const isFileSpecified = env && env.file;
  const entryFiles = isFileSpecified
    ? [`./src/${env.file}.dsa.ts`]
    : glob.sync('./src/**/*.dsa.ts');

  return {
    mode: 'production',
    optimization: {
      usedExports: true,
    },
    entry: entryFiles.reduce((acc, filePath) => {
      const entry = filePath.replace('.dsa.ts', '').replace('src/', ''); // Remove 'src/' from the path
      acc[entry] = `./${filePath}`;
      return acc;
    }, {}),
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
            },
            {
              loader: 'ts-loader',
              options: {
                allowTsInNodeModules: true,
              },
            },
          ],
          exclude: [
            {
              and: [path.resolve(__dirname, 'node_modules')],
              not: [
                path.resolve(__dirname, 'node_modules/dazscript-framework'),
              ],
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.ts'],
      plugins: [new TsconfigPathsPlugin()],
    },
    output: {
      filename: '[name].dsa',
      path: path.resolve(__dirname, 'dist'),
      environment: {
        arrowFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        forOf: true,
        module: false,
      },
    },
  };
};
