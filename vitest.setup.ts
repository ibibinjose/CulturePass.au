/// <reference types="vitest/globals" />

// ─── React Native → react-native-web at the Node resolver level ────────────────
// The vite `resolve.alias` (react-native → react-native-web) only applies to
// modules inside vite's transform graph. Externalized CJS deps such as
// @testing-library/react-native `require("react-native")` through Node's native
// resolver, which loads React Native's Flow-typed source (`import typeof ...`)
// that Node/jsdom can't parse. Patching `Module._resolveFilename` redirects
// those native requires to react-native-web so the whole tree renders under
// jsdom. Must run before any test module (setupFiles execute first).
import Module from "module";
const mod = Module as unknown as {
  _resolveFilename: (request: string, ...args: unknown[]) => string;
};
const originalResolveFilename = mod._resolveFilename;
mod._resolveFilename = function (request: string, ...args: unknown[]): string {
  if (request === "react-native") {
    request = "react-native-web";
  }
  return originalResolveFilename.call(this, request, ...args);
};

// Mock react-native-reanimated with inline no-ops so tests don't require
// native module bindings or TypeScript source transformation of node_modules.
const NOOP = () => {};
const ID = <T>(t: T) => t;

vi.mock("react-native-reanimated", async () => {
  const { View, Text, Image } = await vi.importActual<typeof import("react-native")>("react-native");
  const Animated = { View, Text, Image, createAnimatedComponent: ID };
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withRepeat: ID,
    withSequence: () => 0,
    withTiming: (v: unknown) => v,
    withSpring: (v: unknown) => v,
    withDelay: (_: number, next: unknown) => next,
    cancelAnimation: NOOP,
    runOnJS: ID,
    runOnUI: ID,
    Easing: {
      linear: ID,
      ease: ID,
      bezier: () => ({ factory: ID }),
      in: ID,
      out: ID,
      inOut: ID,
    },
    ...Animated,
  };
});

// Opt into React's act() testing environment so react-test-renderer updates
// don't warn ("not configured to support act(...)").
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Silence expected jsdom-only noise while letting real diagnostics through:
//  - RN's "useNativeDriver is not supported" (no native bridge in jsdom)
//  - the react-test-renderer deprecation banner (still the RN-tree renderer)
const NOISE = ["useNativeDriver", "react-test-renderer is deprecated"];
const isNoise = (msg: unknown) =>
  typeof msg === "string" && NOISE.some((n) => msg.includes(n));

const realWarn = console.warn.bind(console);
const realError = console.error.bind(console);
vi.spyOn(console, "warn").mockImplementation((msg: unknown, ...args: unknown[]) => {
  if (isNoise(msg)) return;
  realWarn(msg, ...args);
});
vi.spyOn(console, "error").mockImplementation((msg: unknown, ...args: unknown[]) => {
  if (isNoise(msg)) return;
  realError(msg, ...args);
});
