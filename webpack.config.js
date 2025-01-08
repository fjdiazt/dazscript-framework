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
          use: ['babel-loader', 'ts-loader'],
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
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
