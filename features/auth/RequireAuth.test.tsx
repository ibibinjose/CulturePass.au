/**
 * Property 2: RequireAuth renders deterministically from auth state
 * Validates: Requirements 1.4, 1.5, 1.6
 *
 * Tests cover the three-way decision table:
 *   initializing=true         → skeleton placeholder, no redirect
 *   initializing=false/false  → <Redirect href="/sign-in" />
 *   initializing=false/true   → children rendered, no redirect
 *
 * Rendering uses `react-test-renderer` directly rather than
 * @testing-library/react-native: under jsdom `react-native` is aliased to
 * react-native-web (see vitest.config.ts), which maps `testID` onto DOM
 * `data-testid`. RNTL's queries look for `testID` on host nodes and so never
 * match. Querying the test-renderer tree by the `testID` prop on the (mocked)
 * component elements sidesteps that mismatch and keeps the assertions honest.
 */

import { Text } from "react-native";
import TestRenderer, { type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import * as fc from "fast-check";
import { vi, describe, it, expect, beforeEach } from "vitest";

// vitest hoists the `vi.mock` calls below above every import, so importing the
// component under test here (with the other imports) still picks up the mocks.
import { RequireAuth } from "./RequireAuth";

// ─── Mock expo-router ─────────────────────────────────────────────────────────
vi.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => (
    <Text testID="redirect" accessibilityLabel={href} />
  ),
}));

// ─── Mock AuthProvider hook ────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock("./AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── Mock UI components ────────────────────────────────────────────────────────
vi.mock("@/components/ui", () => ({
  Screen: ({ children }: { children?: React.ReactNode }) => (
    <Text testID="screen">{children}</Text>
  ),
  Skeleton: ({ className }: { className?: string }) => (
    <Text testID="skeleton" accessibilityLabel={className} />
  ),
}));

// ─── Minimal query helper over react-test-renderer ──────────────────────────────
function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(element);
  });
  const allByTestId = (id: string): ReactTestInstance[] =>
    renderer.root.findAll((node) => node.props?.testID === id);
  return {
    queryAllByTestId: allByTestId,
    queryByTestId: (id: string): ReactTestInstance | null => allByTestId(id)[0] ?? null,
    getByTestId: (id: string): ReactTestInstance => {
      const found = allByTestId(id);
      if (found.length === 0) throw new Error(`Unable to find an element with testID: ${id}`);
      return found[0]!;
    },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("RequireAuth — decision table", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 1.4 — WHEN initializing=true, render skeleton; no redirect.
   */
  it("renders skeleton and no redirect when initializing=true", () => {
    mockUseAuth.mockReturnValue({ initializing: true, isAuthenticated: false });

    const { queryByTestId, queryAllByTestId } = render(
      <RequireAuth>
        <Text testID="child">child</Text>
      </RequireAuth>,
    );

    // Skeleton elements should be present
    expect(queryAllByTestId("skeleton").length).toBeGreaterThan(0);
    // No redirect
    expect(queryByTestId("redirect")).toBeNull();
    // Children NOT rendered
    expect(queryByTestId("child")).toBeNull();
  });

  it("renders skeleton and no redirect when initializing=true (isAuthenticated=true)", () => {
    mockUseAuth.mockReturnValue({ initializing: true, isAuthenticated: true });

    const { queryByTestId, queryAllByTestId } = render(
      <RequireAuth>
        <Text testID="child">child</Text>
      </RequireAuth>,
    );

    expect(queryAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(queryByTestId("redirect")).toBeNull();
    expect(queryByTestId("child")).toBeNull();
  });

  /**
   * 1.5 — WHEN initializing=false and isAuthenticated=false, redirect to /sign-in.
   */
  it("redirects to /sign-in when initializing=false and isAuthenticated=false", () => {
    mockUseAuth.mockReturnValue({ initializing: false, isAuthenticated: false });

    const { getByTestId, queryAllByTestId } = render(
      <RequireAuth>
        <Text testID="child">child</Text>
      </RequireAuth>,
    );

    const redirect = getByTestId("redirect");
    expect(redirect.props.accessibilityLabel).toBe("/sign-in");

    // No skeleton
    expect(queryAllByTestId("skeleton").length).toBe(0);
    // Children NOT rendered
    expect(queryAllByTestId("child").length).toBe(0);
  });

  /**
   * 1.6 — WHEN initializing=false and isAuthenticated=true, render children.
   */
  it("renders children when initializing=false and isAuthenticated=true", () => {
    mockUseAuth.mockReturnValue({ initializing: false, isAuthenticated: true });

    const { getByTestId, queryByTestId, queryAllByTestId } = render(
      <RequireAuth>
        <Text testID="child">child</Text>
      </RequireAuth>,
    );

    expect(getByTestId("child")).toBeTruthy();
    expect(queryByTestId("redirect")).toBeNull();
    expect(queryAllByTestId("skeleton").length).toBe(0);
  });
});

/**
 * Property 2 (PBT): RequireAuth renders deterministically from auth state.
 * Validates: Requirements 1.4, 1.5, 1.6
 *
 * Uses fc.record to generate all 4 boolean combinations and verifies the
 * output matches the decision table for every generated case.
 */
describe("Property 2: RequireAuth renders deterministically from auth state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("satisfies the 3-branch decision table for all (initializing, isAuthenticated) combinations", () => {
    fc.assert(
      fc.property(
        fc.record({
          initializing: fc.boolean(),
          isAuthenticated: fc.boolean(),
        }),
        ({ initializing, isAuthenticated }) => {
          mockUseAuth.mockReturnValue({ initializing, isAuthenticated });

          const { queryByTestId, queryAllByTestId } = render(
            <RequireAuth>
              <Text testID="child">child</Text>
            </RequireAuth>,
          );

          if (initializing) {
            // Branch 1: skeleton, no redirect, no children
            expect(queryAllByTestId("skeleton").length).toBeGreaterThan(0);
            expect(queryByTestId("redirect")).toBeNull();
            expect(queryByTestId("child")).toBeNull();
          } else if (!isAuthenticated) {
            // Branch 2: redirect to /sign-in, no skeleton, no children
            const redirect = queryByTestId("redirect");
            expect(redirect).not.toBeNull();
            expect(redirect?.props.accessibilityLabel).toBe("/sign-in");
            expect(queryAllByTestId("skeleton").length).toBe(0);
            expect(queryAllByTestId("child").length).toBe(0);
          } else {
            // Branch 3: children, no redirect, no skeleton
            expect(queryByTestId("child")).not.toBeNull();
            expect(queryByTestId("redirect")).toBeNull();
            expect(queryAllByTestId("skeleton").length).toBe(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
