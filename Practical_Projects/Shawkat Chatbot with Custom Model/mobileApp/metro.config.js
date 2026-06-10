const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'],
};

config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {},
};

module.exports = config;