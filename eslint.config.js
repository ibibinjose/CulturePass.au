// ESLint 9 flat config. Extends Expo's shared config.
// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "supabase/functions/**",
      "amplify/**",
      ".amplify/**",
      "scripts/**",
    ],
  },
];
