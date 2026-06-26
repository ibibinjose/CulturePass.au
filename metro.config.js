const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Supabase Realtime statically imports `ws`. With package exports enabled
// (the Expo SDK 53 Metro default, which the Babel config deliberately relies on
// for zustand), `ws` resolves via its `require` condition to the Node build —
// which imports Node's `stream` and breaks the React Native bundle. React
// Native ships a global `WebSocket`, so realtime-js never actually calls `ws`
// at runtime; resolve just this module to ws's browser shim so the bundle
// builds cleanly without disabling package exports globally.
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "ws" || moduleName.startsWith("ws/")) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ["browser"] },
      moduleName,
      platform,
    );
  }
  return (baseResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = withNativeWind(config, { input: "./global.css" });
