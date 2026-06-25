module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // unstable_transformImportMeta: rewrites `import.meta` (used by zustand's
      // ESM build, picked up via package exports on web) to Expo's runtime
      // registry, so it doesn't leak raw into the web bundle as a SyntaxError.
      [
        "babel-preset-expo",
        { jsxImportSource: "nativewind", unstable_transformImportMeta: true },
      ],
      "nativewind/babel",
    ],
    plugins: [
      // react-native-reanimated/plugin must be listed last.
      "react-native-reanimated/plugin",
    ],
  };
};
