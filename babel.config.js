module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Preset estándar de Expo + integración con NativeWind
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // NativeWind como *preset*, no como plugin
      'nativewind/babel',
    ],
  };
};
