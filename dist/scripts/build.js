'use strict';

const path = require('path');
const webpack = require('webpack');
const createWebpackConfig = require('../../webpack.config.js');

function runWebpack(workdir, options) {
  const env = {
    context: workdir,
    outputPath: options.outDir || './out',
  };

  if (options.file) {
    env.file = options.file;
  }

  const config = createWebpackConfig(env, {
    mode: options.watch ? 'development' : 'production',
  });

  return new Promise((resolve, reject) => {
    const compiler = webpack(config);

    const handleStats = (error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      if (stats.hasErrors()) {
        reject(new Error(stats.toString({ colors: true })));
        return;
      }

      console.log(
        stats.toString({
          colors: true,
          chunks: false,
          modules: false,
        })
      );

      if (!options.watch) {
        resolve();
      }
    };

    if (options.watch) {
      compiler.watch({}, handleStats);
      return;
    }

    compiler.run((error, stats) => {
      if (error || stats.hasErrors()) {
        handleStats(error, stats);
        compiler.close(() => {});
        return;
      }

      console.log(
        stats.toString({
          colors: true,
          chunks: false,
          modules: false,
        })
      );

      compiler.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });
  });
}

module.exports = {
  runWebpack,
};
