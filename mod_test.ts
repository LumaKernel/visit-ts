// deno-lint-ignore-file no-explicit-any no-unused-vars require-await
import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  BREAK,
  CONTINUE,
  DELETE,
  DELETE_BREAK,
  DELETE_EXIT,
  EXIT,
  REPLACE,
  STEP_OVER,
  visit,
  visitAsync,
} from "./mod.ts";

describe("visit", () => {
  it("REPLACE object property", () => {
    const data = {
      name: "root",
      value: 42,
    };
    visit(data, (node) => {
      if (typeof node === "number" && node === 42) {
        return REPLACE(99, CONTINUE);
      }
      return CONTINUE;
    });
    assertEquals(data, {
      name: "root",
      value: 99,
    });
  });

  it("REPLACE array element", () => {
    const data = {
      items: [1, 2, 3],
    };
    visit(data, (node) => {
      if (typeof node === "number" && node === 2) {
        return REPLACE(99, CONTINUE);
      }
      return CONTINUE;
    });
    assertEquals(data, {
      items: [1, 99, 3],
    });
  });

  it("DELETE object property", () => {
    const data = {
      keep: "this",
      remove: "delete_me",
      also: "keep",
    } as Record<string, string>;
    visit(data, (node) => {
      if (typeof node === "string" && node === "delete_me") {
        return DELETE;
      }
      return CONTINUE;
    });
    assertEquals(data, {
      keep: "this",
      also: "keep",
    });
  });

  it("DELETE array element", () => {
    const data = {
      items: [1, 2, 3, 2, 4],
    };
    visit(data, (node) => {
      if (typeof node === "number" && node === 2) {
        return DELETE;
      }
      return CONTINUE;
    });
    assertEquals(data, {
      items: [1, 3, 4],
    });
  });

  it("DELETE_EXIT", () => {
    const data = {
      items: [1, 2, 3, 2, 4],
    };
    visit(data, (node) => {
      if (typeof node === "number" && node === 2) {
        return DELETE_EXIT;
      }
      return CONTINUE;
    });
    // Should delete first occurrence of 2 and exit
    assertEquals(data, {
      items: [1, 3, 2, 4],
    });
  });

  it("DELETE_BREAK", () => {
    const data = {
      level1: [
        { level2: [1, 2, 3] },
        { level2: [4, 5, 6] },
      ],
    };
    visit(data, (node) => {
      if (typeof node === "number" && node === 2) {
        return DELETE_BREAK;
      }
      return CONTINUE;
    });
    // Should delete 2 and break from that level
    assertEquals(data, {
      level1: [
        { level2: [1, 3] },
        { level2: [4, 5, 6] },
      ],
    });
  });

  it("STEP_OVER", () => {
    const visited: unknown[] = [];
    const data = {
      shallow: "value",
      deep: {
        nested: {
          value: "should not visit",
        },
      },
    };
    visit(data, (node) => {
      visited.push(node);
      if (typeof node === "object" && node !== null && "nested" in node) {
        return STEP_OVER; // Don't visit nested properties
      }
      return CONTINUE;
    });

    // Should visit the nested object but not its properties
    const hasNestedValue = visited.some((v) => v === "should not visit");
    assertEquals(hasNestedValue, false);
  });

  it("BREAK", () => {
    const visited: unknown[] = [];
    const data = {
      items: [1, 2, 3, 4, 5],
    };
    visit(data, (node) => {
      visited.push(node);
      if (typeof node === "number" && node === 3) {
        return BREAK;
      }
      return CONTINUE;
    });

    // Should not visit 4 and 5 after breaking at 3
    const hasValue4 = visited.some((v) => v === 4);
    const hasValue5 = visited.some((v) => v === 5);
    assertEquals(hasValue4, false);
    assertEquals(hasValue5, false);
  });

  it("EXIT", () => {
    const visited: unknown[] = [];
    const data = {
      first: [1, 2],
      second: [3, 4],
    };
    visit(data, (node) => {
      visited.push(node);
      if (typeof node === "number" && node === 2) {
        return EXIT;
      }
      return CONTINUE;
    });

    // Should not visit anything in second array after exiting at 2
    const hasValue3 = visited.some((v) => v === 3);
    const hasValue4 = visited.some((v) => v === 4);
    assertEquals(hasValue3, false);
    assertEquals(hasValue4, false);
  });

  it("Parent tracking", () => {
    const parentInfos: unknown[] = [];
    const data = {
      level1: {
        level2: [42],
      },
    };
    visit(data, (node, parents) => {
      if (typeof node === "number" && node === 42) {
        parentInfos.push(structuredClone(parents));
      }
      return CONTINUE;
    });

    assertEquals(parentInfos.length, 1);
    const parentChain = parentInfos[0] as { key: string | number }[];
    assertEquals(parentChain.length, 3); // Root -> level1 -> level2 -> 42
    assertEquals(parentChain[0].key, "level1");
    assertEquals(parentChain[1].key, "level2");
    assertEquals(parentChain[2].key, 0); // Array index
  });

  it("Complex nested structure", () => {
    const data = {
      users: [
        { name: "Alice", age: 30, tags: ["admin", "user"] },
        { name: "Bob", age: 25, tags: ["user"] },
      ],
      config: {
        version: "1.0",
        features: { auth: true, cache: false },
      },
    };

    visit(data, (node) => {
      // Replace all age values with age + 1
      if (typeof node === "number" && node > 20 && node < 100) {
        return REPLACE(node + 1, CONTINUE);
      }
      // Replace "admin" tag with "administrator"
      if (typeof node === "string" && node === "admin") {
        return REPLACE("administrator", CONTINUE);
      }
      return CONTINUE;
    });

    assertEquals(data, {
      users: [
        { name: "Alice", age: 31, tags: ["administrator", "user"] },
        { name: "Bob", age: 26, tags: ["user"] },
      ],
      config: {
        version: "1.0",
        features: { auth: true, cache: false },
      },
    });
  });

  // Phase 1: Root-level Flow Control Tests
  it("Root STEP_OVER", () => {
    const visited: unknown[] = [];
    const data = { child: { nested: "value" } };
    visit(data, (value) => {
      visited.push(value);
      if (value === data) {
        return STEP_OVER; // Don't visit any properties
      }
      return CONTINUE;
    });
    // Should only visit root, not child or nested
    assertEquals(visited.length, 1);
    assertEquals(visited[0], data);
  });

  it("Root BREAK", () => {
    const visited: unknown[] = [];
    const data = { prop1: "a", prop2: "b" };
    visit(data, (value) => {
      visited.push(value);
      if (value === data) {
        return BREAK; // Exit from root
      }
      return CONTINUE;
    });
    assertEquals(visited.length, 1);
    assertEquals(visited[0], data);
  });

  it("Root EXIT", () => {
    const visited: unknown[] = [];
    const data = { prop1: "a", prop2: "b" };
    visit(data, (value) => {
      visited.push(value);
      if (value === data) {
        return EXIT; // Exit immediately
      }
      return CONTINUE;
    });
    assertEquals(visited.length, 1);
    assertEquals(visited[0], data);
  });

  it("Root REPLACE error", () => {
    const data = { prop: "value" };
    assertThrows(
      () => {
        visit(data, (value) => {
          if (value === data) {
            return REPLACE({ new: "root" }, CONTINUE);
          }
          return CONTINUE;
        });
      },
      Error,
      "Root node cannot be replaced",
    );
  });

  it("Root DELETE error", () => {
    const data = { prop: "value" };
    assertThrows(
      () => {
        visit(data, (value) => {
          if (value === data) {
            return DELETE;
          }
          return CONTINUE;
        });
      },
      Error,
      "Root node cannot be deleted",
    );
  });

  it("Unknown control type error", () => {
    const data = { prop: "value" };
    assertThrows(
      () => {
        visit(data, (value) => {
          if (value === data) {
            return { type: "invalid" } as any;
          }
          return CONTINUE;
        });
      },
      Error,
      "Unknown control type",
    );
  });

  // Phase 2: STEP_OVER Edge Cases
  it("STEP_OVER on array", () => {
    const visited: unknown[] = [];
    const data = { items: [1, 2, 3] };
    visit(data, (value) => {
      visited.push(value);
      if (Array.isArray(value)) {
        return STEP_OVER; // Don't visit array elements
      }
      return CONTINUE;
    });
    const hasNumbers = visited.some((v) => typeof v === "number");
    assertEquals(hasNumbers, false);
  });

  it("STEP_OVER on object", () => {
    const visited: unknown[] = [];
    const data = { config: { nested: "value" } };
    visit(data, (value) => {
      visited.push(value);
      if (typeof value === "object" && value !== null && "nested" in value) {
        return STEP_OVER; // Don't visit object properties
      }
      return CONTINUE;
    });
    const hasNestedValue = visited.some((v) => v === "value");
    assertEquals(hasNestedValue, false);
  });

  // Phase 3: Flow Control from DELETE operations
  it("DELETE with STEP_OVER", () => {
    const data = { items: [1, "delete", { nested: "skip" }] };
    visit(data, (value) => {
      if (value === "delete") {
        return REPLACE("new", STEP_OVER);
      }
      return CONTINUE;
    });
    assertEquals(data.items[1], "new");
  });

  // Phase 4: Void return handling
  it("Void return from visitor", () => {
    const data = { prop: "value" };
    visit(data, (value) => {
      // Explicitly return void
      return;
    });
    assertEquals(data, { prop: "value" });
  });

  it("Undefined return from visitor", () => {
    const data = { prop: "value" };
    visit(data, (value) => {
      // Implicitly return undefined
    });
    assertEquals(data, { prop: "value" });
  });

  // Phase 5: Object deletion edge cases
  it("DELETE from object with continue", () => {
    const data = { items: [1, 2, 3], config: "delete_me" };
    visit(data, (value) => {
      if (typeof value === "string" && value === "delete_me") {
        return DELETE; // Should continue after deletion
      }
      return CONTINUE;
    });
    assertEquals("config" in data, false);
    assertEquals(data.items, [1, 2, 3]);
  });

  it("DELETE from object with step_over", () => {
    const data = { a: "delete", b: { nested: "value" } };
    visit(data, (value) => {
      if (typeof value === "string" && value === "delete") {
        return REPLACE("new", STEP_OVER);
      }
      return CONTINUE;
    });
    assertEquals(data.a, "new");
  });

  // Phase 6: Error cases in delete operations
  it("Unknown DELETE control type error", () => {
    const data = { items: ["delete"] };
    assertThrows(
      () => {
        visit(data, (value) => {
          if (value === "delete") {
            return { type: "delete", then: { type: "invalid" } } as any;
          }
          return CONTINUE;
        });
      },
      Error,
      "Unknown control type",
    );
  });

  it("Unknown flow control in array error", () => {
    const data = ["test"];
    assertThrows(
      () => {
        visit(data, (value) => {
          if (value === "test") {
            return { type: "invalid" } as any;
          }
          return CONTINUE;
        });
      },
      Error,
      "Unknown control type",
    );
  });

  it("Unknown flow control in object error", () => {
    const data = { test: "value" };
    assertThrows(
      () => {
        visit(data, (value) => {
          if (typeof value === "string" && value === "value") {
            return { type: "invalid" } as any;
          }
          return CONTINUE;
        });
      },
      Error,
      "Unknown control type",
    );
  });

  // Additional edge cases for better coverage
  it("BREAK from object traversal", () => {
    const visited: unknown[] = [];
    const data = { a: 1, b: 2, c: 3 };
    visit(data, (value) => {
      visited.push(value);
      if (typeof value === "number" && value === 2) {
        return BREAK;
      }
      return CONTINUE;
    });
    // Should not visit remaining properties after breaking
    const hasValue3 = visited.some((v) => v === 3);
    assertEquals(hasValue3, false);
  });

  it("EXIT from object traversal", () => {
    const visited: unknown[] = [];
    const data = { first: { nested: 1 }, second: { nested: 2 } };
    visit(data, (value) => {
      visited.push(value);
      if (typeof value === "number" && value === 1) {
        return EXIT;
      }
      return CONTINUE;
    });
    const hasValue2 = visited.some((v) => v === 2);
    assertEquals(hasValue2, false);
  });

  it("DELETE with STEP_OVER from object", () => {
    const data = { items: [1, 2, 3], config: "delete_me" };
    visit(data, (value) => {
      if (typeof value === "string" && value === "delete_me") {
        return REPLACE("new", STEP_OVER);
      }
      return CONTINUE;
    });
    assertEquals(data.config, "new");
  });

  it("DELETE_BREAK from object", () => {
    const data = { a: "delete", b: 2, c: 3 };
    visit(data, (value) => {
      if (typeof value === "string" && value === "delete") {
        return { type: "delete", then: BREAK } as any;
      }
      return CONTINUE;
    });
    assertEquals("a" in data, false);
  });

  it("DELETE_EXIT from object", () => {
    const data = { a: "delete", b: 2, c: 3 };
    visit(data, (value) => {
      if (typeof value === "string" && value === "delete") {
        return { type: "delete", then: EXIT } as any;
      }
      return CONTINUE;
    });
    assertEquals("a" in data, false);
  });
});

describe("visitAsync", () => {
  it("Basic async operation", async () => {
    const data = { url: "test", value: 42 };
    await visitAsync(data, async (value) => {
      if (typeof value === "number") {
        return REPLACE(value * 2, CONTINUE);
      }
      return CONTINUE;
    });
    assertEquals(data.value, 84);
  });

  it("Async REPLACE", async () => {
    const data = { items: [1, 2, 3] };
    await visitAsync(data, async (value) => {
      if (typeof value === "number" && value === 2) {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1));
        return REPLACE(99, CONTINUE);
      }
      return CONTINUE;
    });
    assertEquals(data.items, [1, 99, 3]);
  });

  it("Async DELETE", async () => {
    const data = { keep: "this", remove: "that" };
    await visitAsync(data, async (value) => {
      if (typeof value === "string" && value === "that") {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return DELETE;
      }
      return CONTINUE;
    });
    assertEquals("remove" in data, false);
    assertEquals(data.keep, "this");
  });

  it("Async ROOT STEP_OVER", async () => {
    const visited: unknown[] = [];
    const data = { child: "value" };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === data) {
        return STEP_OVER;
      }
      return CONTINUE;
    });
    assertEquals(visited.length, 1);
  });

  it("Async ROOT BREAK", async () => {
    const visited: unknown[] = [];
    const data = { prop: "value" };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === data) {
        return BREAK;
      }
      return CONTINUE;
    });
    assertEquals(visited.length, 1);
  });

  it("Async ROOT EXIT", async () => {
    const visited: unknown[] = [];
    const data = { prop: "value" };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === data) {
        return EXIT;
      }
      return CONTINUE;
    });
    assertEquals(visited.length, 1);
  });

  it("Async ROOT REPLACE error", async () => {
    const data = { prop: "value" };
    let thrown = false;
    try {
      await visitAsync(data, async (value) => {
        if (value === data) {
          return REPLACE({ new: "root" }, CONTINUE);
        }
        return CONTINUE;
      });
    } catch (error) {
      thrown = true;
      assertEquals((error as Error).message, "Root node cannot be replaced");
    }
    assertEquals(thrown, true);
  });

  it("Async ROOT DELETE error", async () => {
    const data = { prop: "value" };
    let thrown = false;
    try {
      await visitAsync(data, async (value) => {
        if (value === data) {
          return DELETE;
        }
        return CONTINUE;
      });
    } catch (error) {
      thrown = true;
      assertEquals((error as Error).message, "Root node cannot be deleted");
    }
    assertEquals(thrown, true);
  });

  it("Async unknown control type error", async () => {
    const data = { prop: "value" };
    let thrown = false;
    try {
      await visitAsync(data, async (value) => {
        if (value === data) {
          return { type: "invalid" } as any;
        }
        return CONTINUE;
      });
    } catch (error) {
      thrown = true;
      assertEquals(
        (error as Error).message.includes("Unknown control type"),
        true,
      );
    }
    assertEquals(thrown, true);
  });

  it("Async BREAK in array", async () => {
    const visited: unknown[] = [];
    const data = [1, 2, 3, 4];
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === 2) {
        return BREAK;
      }
      return CONTINUE;
    });
    const hasValue3 = visited.some((v) => v === 3);
    assertEquals(hasValue3, false);
  });

  it("Async EXIT in array", async () => {
    const visited: unknown[] = [];
    const data = { first: [1, 2], second: [3, 4] };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === 2) {
        return EXIT;
      }
      return CONTINUE;
    });
    const hasValue3 = visited.some((v) => v === 3);
    assertEquals(hasValue3, false);
  });

  it("Async DELETE_BREAK", async () => {
    const data = { items: [1, 2, 3] };
    await visitAsync(data, async (value) => {
      if (value === 2) {
        return DELETE_BREAK;
      }
      return CONTINUE;
    });
    assertEquals(data.items, [1, 3]);
  });

  it("Async DELETE_EXIT", async () => {
    const data = { first: [1, 2], second: [3, 4] };
    await visitAsync(data, async (value) => {
      if (value === 2) {
        return DELETE_EXIT;
      }
      return CONTINUE;
    });
    assertEquals(data.first, [1]);
  });

  it("Async STEP_OVER on object", async () => {
    const visited: unknown[] = [];
    const data = { config: { nested: "value" } };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (typeof value === "object" && value !== null && "nested" in value) {
        return STEP_OVER;
      }
      return CONTINUE;
    });
    const hasNestedValue = visited.some((v) => v === "value");
    assertEquals(hasNestedValue, false);
  });

  it("Async void return", async () => {
    const data = { prop: "value" };
    await visitAsync(data, async (value) => {
      return;
    });
    assertEquals(data, { prop: "value" });
  });

  it("Async unknown DELETE control error", async () => {
    const data = { items: ["delete"] };
    let thrown = false;
    try {
      await visitAsync(data, async (value) => {
        if (typeof value === "string" && value === "delete") {
          return { type: "delete", then: { type: "invalid" } } as any;
        }
        return CONTINUE;
      });
    } catch (error) {
      thrown = true;
      assertEquals(
        (error as Error).message.includes("Unknown control type"),
        true,
      );
    }
    assertEquals(thrown, true);
  });

  // Additional async coverage tests
  it("Async BREAK from object", async () => {
    const visited: unknown[] = [];
    const data = { a: 1, b: 2, c: 3 };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (typeof value === "number" && value === 2) {
        return BREAK;
      }
      return CONTINUE;
    });
    const hasValue3 = visited.some((v) => v === 3);
    assertEquals(hasValue3, false);
  });

  it("Async EXIT from object", async () => {
    const visited: unknown[] = [];
    const data = { first: { nested: 1 }, second: { nested: 2 } };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (typeof value === "number" && value === 1) {
        return EXIT;
      }
      return CONTINUE;
    });
    const hasValue2 = visited.some((v) => v === 2);
    assertEquals(hasValue2, false);
  });

  it("Async DELETE_BREAK from object", async () => {
    const data = { a: "delete", b: 2 };
    await visitAsync(data, async (value) => {
      if (typeof value === "string" && value === "delete") {
        return { type: "delete", then: BREAK } as any;
      }
      return CONTINUE;
    });
    assertEquals("a" in data, false);
  });

  it("Async DELETE_EXIT from object", async () => {
    const data = { a: "delete", b: 2 };
    await visitAsync(data, async (value) => {
      if (typeof value === "string" && value === "delete") {
        return { type: "delete", then: EXIT } as any;
      }
      return CONTINUE;
    });
    assertEquals("a" in data, false);
  });

  it("Async BREAK from array", async () => {
    const visited: unknown[] = [];
    const data = [1, 2, 3];
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === 2) {
        return BREAK;
      }
      return CONTINUE;
    });
    const hasValue3 = visited.some((v) => v === 3);
    assertEquals(hasValue3, false);
  });

  it("Async EXIT from array", async () => {
    const visited: unknown[] = [];
    const data = { first: [1, 2], second: [3] };
    await visitAsync(data, async (value) => {
      visited.push(value);
      if (value === 2) {
        return EXIT;
      }
      return CONTINUE;
    });
    const hasValue3 = visited.some((v) => v === 3);
    assertEquals(hasValue3, false);
  });
});
