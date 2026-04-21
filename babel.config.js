module.exports = {
  presets: [
    [
      require.resolve('@babel/preset-env'),
      {
        targets: {
          esmodules: true,
          ie: '11',
        },
        include: ['@babel/plugin-transform-class-properties'],
      },
    ],
    require.resolve('@babel/preset-typescript'),
  ],
  plugins: [
    require.resolve('@babel/plugin-transform-class-properties'),
    require.resolve('babel-plugin-transform-typescript-metadata'),
    [require.resolve('@babel/plugin-proposal-decorators'), { version: 'legacy' }],
    [require.resolve('@babel/plugin-transform-arrow-functions')],
    require.resolve('@babel/plugin-transform-block-scoping'),
    require.resolve('@babel/plugin-proposal-class-properties'),
    require.resolve('@babel/plugin-transform-private-property-in-object'),
    require.resolve('@babel/plugin-transform-private-methods'),
  ],
};
