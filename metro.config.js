const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Amplify (AppSync realtime / subscriptions) and some libs statically import `ws`.
// With package exports enabled (Expo SDK 53 Metro default), `ws` resolves to the
// Node build which pulls in `stream` and breaks RN. React Native has global WebSocket,
// so we shim only the `ws` module to its browser build. This keeps the bundle working
// without disabling package exports globally.
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
