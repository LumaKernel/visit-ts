// deno-lint-ignore-file no-explicit-any

/**
 * Flow control type that indicates traversal should continue normally to child nodes.
 */
export type VisitFlowControlContinue = {
  readonly type: "continue";
};
/**
 * Flow control type that indicates traversal should skip visiting child nodes of the current node.
 */
export type VisitFlowControlStepOver = {
  readonly type: "step_over";
};

/**
 * Flow control type that indicates traversal should stop processing siblings at the current level.
 */
export type VisitFlowControlBreak = {
  readonly type: "break";
};

/**
 * Flow control type that indicates traversal should immediately exit entirely.
 */
export type VisitFlowControlExit = {
  readonly type: "exit";
};

/**
 * Flow control type that indicates the current node should be replaced with a new value.
 */
export type VisitFlowControlReplace = {
  readonly type: "replace";
  /** The new value to replace the current node with */
  readonly value: unknown;
  /** The flow control action to take after replacement */
  readonly then: VisitFlowControlThen;
};

/**
 * Flow control type that indicates the current node should be deleted from its parent's children array.
 */
export type VisitFlowControlDelete = {
  readonly type: "delete";
  /** The flow control action to take after deletion */
  readonly then: VisitFlowControlThen;
};
/**
 * Union type for flow control actions that can be used after replacement or deletion operations.
 */
export type VisitFlowControlThen =
  | VisitFlowControlContinue
  | VisitFlowControlStepOver
  | VisitFlowControlBreak
  | VisitFlowControlExit;

/**
 * Union type for flow control actions that modify the tree structure (replace or delete).
 */
export type VisitFlowControlUpdator =
  | VisitFlowControlReplace
  | VisitFlowControlDelete;

/**
 * Union type representing all possible flow control actions during tree traversal.
 */
export type VisitFlowControl = VisitFlowControlThen | VisitFlowControlUpdator;

/**
 * Information about a parent node in the traversal hierarchy.
 */
export type ParentInfo = {
  /** The parent node object */
  readonly node: unknown;
  /** The property name or array index where this node is located in the parent */
  readonly key: string | number;
};

/**
 * Flow control constant that continues normal traversal to child nodes.
 * This is the default behavior when no specific flow control is needed.
 */
export const CONTINUE: VisitFlowControlContinue = Object.freeze({
  type: "continue",
});

/**
 * Flow control constant that skips visiting child nodes of the current node.
 * Useful when you want to process a node but not its descendants.
 */
export const STEP_OVER: VisitFlowControlStepOver = Object.freeze({
  type: "step_over",
});

/**
 * Creates a flow control action to replace the current node with a new value.
 *
 * @param value - The new value to replace the current node with
 * @param then - The flow control action to take after replacement
 * @returns A replace flow control object
 *
 * @example
 * ```ts
 * // Replace a node and continue traversal
 * return REPLACE({ type: "new", children: [] }, CONTINUE);
 *
 * // Replace a node and skip its children
 * return REPLACE({ type: "new", children: [] }, STEP_OVER);
 * ```
 */
export const REPLACE = (
  value: unknown,
  then: VisitFlowControlThen,
): VisitFlowControlReplace => Object.freeze({ type: "replace", value, then });

/**
 * Flow control constant that stops processing siblings at the current level.
 * The traversal will return to the parent level and continue with the next sibling of the parent.
 */
export const BREAK: VisitFlowControlBreak = Object.freeze({ type: "break" });

/**
 * Flow control constant that immediately exits the entire traversal.
 * No further nodes will be processed.
 */
export const EXIT: VisitFlowControlExit = Object.freeze({ type: "exit" });

/**
 * Flow control constant that deletes the current node and continues normal traversal.
 * Equivalent to `DELETE_CONTINUE`.
 */
export const DELETE: VisitFlowControlDelete = Object.freeze({
  type: "delete",
  then: CONTINUE,
});

/**
 * Flow control constant that deletes the current node and stops processing siblings.
 */
export const DELETE_BREAK: VisitFlowControlDelete = Object.freeze({
  type: "delete",
  then: BREAK,
});

/**
 * Flow control constant that deletes the current node and exits the entire traversal.
 */
export const DELETE_EXIT: VisitFlowControlDelete = Object.freeze({
  type: "delete",
  then: EXIT,
});

/**
 * Utility type that converts `any` to `unknown` for safer type handling.
 * @internal
 */
type NonAny<T> = 0 extends 1 & T ? unknown : T;

/**
 * Recursive utility type that extracts all node types that can appear in a data structure.
 * This includes the root node type and all nested property/array element types up to a certain depth.
 * @internal
 */
type RecursiveChildren<T, depth = ".........."> = depth extends
  `.${infer nextDepth}`
  ? T extends readonly (infer U)[]
    ? NonAny<T> | NonAny<U> | RecursiveChildren<U, nextDepth>
  : T extends object ?
      | NonAny<T>
      | {
        [K in keyof T]: T[K] extends object | readonly unknown[]
          ? NonAny<T[K]> | RecursiveChildren<T[K], nextDepth>
          : never;
      }[keyof T]
  : NonAny<T>
  : never;

/**
 * Synchronously traverses any data structure, calling a visitor function for each value.
 *
 * Visits all object properties and array elements recursively. The visitor function can
 * return flow control instructions to modify traversal behavior, replace values, or delete values.
 *
 * @template T - The type of the root data structure
 * @param node - The root data structure to start traversal from
 * @param visitor - Function called for each value. Receives the current value and array of parent information.
 *                  Can return flow control instructions or void/undefined to continue normally.
 *
 * @example
 * ```ts
 * const data = {
 *   name: "root",
 *   items: [
 *     { type: "item", value: 1 },
 *     { type: "item", value: 2 }
 *   ],
 *   config: { enabled: true }
 * };
 *
 * visit(data, (value, parents) => {
 *   console.log(`Visiting:`, value, `at depth: ${parents.length}`);
 *   if (typeof value === "object" && value?.type === "item" && value.value === 1) {
 *     return REPLACE({ ...value, value: 99 }, CONTINUE);
 *   }
 *   return CONTINUE;
 * });
 * ```
 */
export const visit = <T>(
  node: T,
  visitor: (
    node: RecursiveChildren<T>,
    parents: readonly ParentInfo[],
  ) => VisitFlowControl | void,
): void => {
  const parents: ParentInfo[] = [];
  const control = visitor(node as any, parents) ?? { type: "continue" };
  switch (control.type) {
    case "continue":
      break;
    case "step_over":
      return;
    case "break":
      return;
    case "exit":
      return;
    case "replace":
      throw new Error(`Root node cannot be replaced`);
    case "delete":
      throw new Error(`Root node cannot be deleted`);
    default:
      throw new Error(
        `Unknown control type: ${
          (control satisfies never as { type: 0 }).type
        }`,
      );
  }
  let exitting = false;
  const dfs = (node: unknown) => {
    if (typeof node === "object" && node !== null) {
      if (Array.isArray(node)) {
        // Handle arrays
        for (let index = 0; index < node.length; index++) {
          const child: unknown = node[index];
          parents.push({ node, key: index });
          let control = visitor(child as any, parents) ?? { type: "continue" };
          if (control.type === "replace") {
            node[index] = control.value;
            control = control.then;
          } else if (control.type === "delete") {
            node.splice(index, 1);
            index--;
            if (
              control.then.type === "continue" ||
              control.then.type === "step_over"
            ) {
              continue;
            } else if (control.then.type === "break") {
              return;
            } else if (control.then.type === "exit") {
              exitting = true;
              return;
            } else {
              throw new Error(
                `Unknown control type: ${
                  (control.then satisfies never as { type: 0 }).type
                }`,
              );
            }
          }
          if (control.type === "continue") {
            dfs(child);
            if (exitting) return;
          } else if (control.type === "step_over") {
            continue;
          } else if (control.type === "break") {
            return;
          } else if (control.type === "exit") {
            exitting = true;
            return;
          } else {
            throw new Error(
              `Unknown control type: ${
                (control satisfies never as { type: 0 }).type
              }`,
            );
          }
          parents.pop();
        }
      } else {
        // Handle objects
        for (const key in node) {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            const child: unknown = (node as any)[key];
            parents.push({ node, key });
            let control = visitor(child as any, parents) ??
              { type: "continue" };
            if (control.type === "replace") {
              (node as any)[key] = control.value;
              control = control.then;
            } else if (control.type === "delete") {
              delete (node as any)[key];
              if (
                control.then.type === "continue" ||
                control.then.type === "step_over"
              ) {
                continue;
              } else if (control.then.type === "break") {
                return;
              } else if (control.then.type === "exit") {
                exitting = true;
                return;
              } else {
                throw new Error(
                  `Unknown control type: ${
                    (control.then satisfies never as { type: 0 }).type
                  }`,
                );
              }
            }
            if (control.type === "continue") {
              dfs(child);
              if (exitting) return;
            } else if (control.type === "step_over") {
              continue;
            } else if (control.type === "break") {
              return;
            } else if (control.type === "exit") {
              exitting = true;
              return;
            } else {
              throw new Error(
                `Unknown control type: ${
                  (control satisfies never as { type: 0 }).type
                }`,
              );
            }
            parents.pop();
          }
        }
      }
    }
  };
  dfs(node);
};

/**
 * Asynchronously traverses any data structure, calling a visitor function for each value.
 *
 * Similar to the synchronous `visit` function, but supports async visitor functions
 * that can perform asynchronous operations like API calls, file I/O, etc.
 * Visits all object properties and array elements recursively.
 *
 * @template T - The type of the root data structure
 * @param node - The root data structure to start traversal from
 * @param visitor - Async function called for each value. Receives the current value and array of parent information.
 *                  Can return flow control instructions, a Promise resolving to flow control instructions,
 *                  or void/undefined to continue normally.
 *
 * @example
 * ```ts
 * const data = {
 *   name: "api-root",
 *   endpoints: [
 *     { type: "api-node", url: "/api/data" },
 *     { type: "static", content: "hello" }
 *   ]
 * };
 *
 * await visitAsync(data, async (value, parents) => {
 *   if (typeof value === "object" && value?.type === "api-node") {
 *     const response = await fetch(value.url);
 *     const data = await response.json();
 *     return REPLACE({ ...value, data }, CONTINUE);
 *   }
 *   return CONTINUE;
 * });
 * ```
 */
export const visitAsync = async <T>(
  node: T,
  visitor: (
    node: RecursiveChildren<T>,
    parents: readonly ParentInfo[],
  ) => VisitFlowControl | void | Promise<VisitFlowControl | void>,
): Promise<void> => {
  const parents: ParentInfo[] = [];
  const control = (await visitor(node as any, parents)) ?? { type: "continue" };
  switch (control.type) {
    case "continue":
      break;
    case "step_over":
      return;
    case "break":
      return;
    case "exit":
      return;
    case "replace":
      throw new Error(`Root node cannot be replaced`);
    case "delete":
      throw new Error(`Root node cannot be deleted`);
    default:
      throw new Error(
        `Unknown control type: ${
          (control satisfies never as { type: 0 }).type
        }`,
      );
  }
  let exitting = false;
  const dfs = async (node: unknown) => {
    if (typeof node === "object" && node !== null) {
      if (Array.isArray(node)) {
        // Handle arrays
        for (let index = 0; index < node.length; index++) {
          const child: unknown = node[index];
          parents.push({ node, key: index });
          let control = (await visitor(child as any, parents)) ?? {
            type: "continue",
          };
          if (control.type === "replace") {
            node[index] = control.value;
            control = control.then;
          } else if (control.type === "delete") {
            node.splice(index, 1);
            index--;
            if (
              control.then.type === "continue" ||
              control.then.type === "step_over"
            ) {
              continue;
            } else if (control.then.type === "break") {
              return;
            } else if (control.then.type === "exit") {
              exitting = true;
              return;
            } else {
              throw new Error(
                `Unknown control type: ${
                  (control.then satisfies never as { type: 0 }).type
                }`,
              );
            }
          }
          if (control.type === "continue") {
            await dfs(child);
            if (exitting) return;
          } else if (control.type === "step_over") {
            continue;
          } else if (control.type === "break") {
            return;
          } else if (control.type === "exit") {
            exitting = true;
            return;
          } else {
            throw new Error(
              `Unknown control type: ${
                (control satisfies never as { type: 0 }).type
              }`,
            );
          }
          parents.pop();
        }
      } else {
        // Handle objects
        for (const key in node) {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            const child: unknown = (node as any)[key];
            parents.push({ node, key });
            let control = (await visitor(child as any, parents)) ?? {
              type: "continue",
            };
            if (control.type === "replace") {
              (node as any)[key] = control.value;
              control = control.then;
            } else if (control.type === "delete") {
              delete (node as any)[key];
              if (
                control.then.type === "continue" ||
                control.then.type === "step_over"
              ) {
                continue;
              } else if (control.then.type === "break") {
                return;
              } else if (control.then.type === "exit") {
                exitting = true;
                return;
              } else {
                throw new Error(
                  `Unknown control type: ${
                    (control.then satisfies never as { type: 0 }).type
                  }`,
                );
              }
            }
            if (control.type === "continue") {
              await dfs(child);
              if (exitting) return;
            } else if (control.type === "step_over") {
              continue;
            } else if (control.type === "break") {
              return;
            } else if (control.type === "exit") {
              exitting = true;
              return;
            } else {
              throw new Error(
                `Unknown control type: ${
                  (control satisfies never as { type: 0 }).type
                }`,
              );
            }
            parents.pop();
          }
        }
      }
    }
  };
  await dfs(node);
};
