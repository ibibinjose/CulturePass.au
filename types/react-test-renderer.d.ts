// Minimal ambient types for react-test-renderer (ships no declarations, and
// @types/react-test-renderer is not a dependency). Covers only the surface used
// by unit tests: creating a renderer, act(), and traversing the instance tree.
declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  export interface ReactTestInstance {
    type: unknown;
    props: Record<string, unknown>;
    parent: ReactTestInstance | null;
    children: (ReactTestInstance | string)[];
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    toJSON(): unknown;
    update(element: ReactElement): void;
    unmount(): void;
  }

  export function create(element: ReactElement, options?: unknown): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): void;

  const TestRenderer: {
    create: typeof create;
    act: typeof act;
  };
  export default TestRenderer;
}
