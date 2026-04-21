const path = require('path');
const glob = require('glob');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, argv) => {
  const projectRoot =
    env && env.context ? path.resolve(env.context) : process.cwd();
  const sourceRoot = path.resolve(projectRoot, 'src');
  const isFileSpecified = env && env.file;
  const entryFiles = isFileSpecified
    ? [path.resolve(sourceRoot, `${env.file}.dsa.ts`)]
    : glob
        .sync(path.join(sourceRoot, '**/*.dsa.ts').replace(/\\/g, '/'))
        .map((filePath) => path.resolve(filePath));

  const outputPath =
    env && env.outputPath
      ? path.resolve(projectRoot, env.outputPath)
      : path.resolve(__dirname, 'out');

  return {
    context: projectRoot,
    mode: 'production',
    optimization: {
      usedExports: true,
    },
    entry: entryFiles.reduce((acc, filePath) => {
      const entry = path
        .relative(sourceRoot, filePath)
        .replace(/\\/g, '/')
        .replace('.dsa.ts', '');
      acc[entry] = filePath;
      return acc;
    }, {}),
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: require('./babel.config.js'),
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
              and: [path.resolve(projectRoot, 'node_modules')],
              not: [
                path.resolve(__dirname, 'node_modules/dazscript-framework/src'),
              ],
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.ts'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: path.resolve(projectRoot, 'tsconfig.json'),
        }),
      ],
    },
    resolveLoader: {
      modules: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(projectRoot, 'node_modules'),
        'node_modules',
      ],
    },
    output: {
      filename: '[name].dsa',
      path: outputPath,
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
