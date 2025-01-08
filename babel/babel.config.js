module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          esmodules: true,
          ie: '11',
        },
        include: ['@babel/plugin-transform-class-properties'],
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    'babel-plugin-transform-typescript-metadata',
    ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
    ['@babel/plugin-transform-arrow-functions'],
    '@babel/plugin-transform-block-scoping',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-private-property-in-object',
    '@babel/plugin-transform-private-methods',
    [
      'dazscript-framework/babel/trace-babel-plugin', // Ensure this path is correct
      { default: false, retainLines: false },
    ],
    [
      'dazscript-framework/babel/trace-log-babel-plugin', // Ensure this path is correct
      { default: false, retainLines: false },
    ],
  ],
};
