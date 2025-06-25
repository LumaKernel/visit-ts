# visit-ts

A powerful TypeScript library for traversing and manipulating any data structure
with fine-grained flow control. Perfect for data transformation, recursive
processing, and any scenario requiring deep data structure traversal.

## Features

- 🗂️ **Universal Traversal**: Visit all object properties and array elements
  recursively
- 🔄 **Flow Control**: CONTINUE, BREAK, EXIT, STEP_OVER operations
- ✏️ **Data Manipulation**: REPLACE and DELETE values during traversal
- 🔗 **Parent Tracking**: Access parent information and property keys during
  traversal
- ⚡ **Async Support**: Both synchronous and asynchronous traversal
- 🦕 **Deno Ready**: Built for Deno with JSR compatibility
- 🏷️ **Type Safe**: Full TypeScript support with advanced type inference

## Installation

```bash
# Using Deno
import { visit, CONTINUE, REPLACE } from "jsr:@luma-dev/visit-ts";

# Using JSR with other runtimes
npx jsr add @luma-dev/visit-ts
```

## Quick Start

```ts
import { CONTINUE, DELETE, REPLACE, visit } from "jsr:@luma-dev/visit-ts";

// Any data structure
const data = {
  name: "users",
  items: [
    { name: "Alice", age: 30, active: true },
    { name: "Bob", age: 25, active: false },
  ],
  config: { version: "1.0", debug: true },
};

// Transform data during traversal
visit(data, (value) => {
  // Increment all ages
  if (typeof value === "number" && value > 18 && value < 100) {
    return REPLACE(value + 1, CONTINUE);
  }
  // Remove debug flag
  if (value === true && typeof value === "boolean") {
    // This will find debug: true and remove it
    return DELETE;
  }
  return CONTINUE;
});

console.log(data);
// Output: { name: "users", items: [{ name: "Alice", age: 31, active: true }, { name: "Bob", age: 26, active: false }], config: { version: "1.0" } }
```

## Flow Control Options

### CONTINUE

Continue normal traversal to nested values:

```ts
visit(data, (value) => {
  console.log("Visiting:", value);
  return CONTINUE; // Visit nested properties and array elements
});
```

### STEP_OVER

Skip visiting nested properties/elements of the current value:

```ts
visit(data, (value) => {
  if (typeof value === "object" && value?.type === "private") {
    return STEP_OVER; // Don't visit properties of private objects
  }
  return CONTINUE;
});
```

### BREAK

Stop processing siblings at the current level:

```ts
visit(data, (value) => {
  if (value === "stop") {
    return BREAK; // Stop processing other properties/elements at this level
  }
  return CONTINUE;
});
```

### EXIT

Immediately exit the entire traversal:

```ts
visit(data, (value) => {
  if (value === "error") {
    return EXIT; // Stop everything
  }
  return CONTINUE;
});
```

## Data Manipulation

### REPLACE

Replace any value with a new value:

```ts
visit(data, (value) => {
  if (typeof value === "string" && value.startsWith("old_")) {
    return REPLACE(
      value.replace("old_", "new_"),
      CONTINUE, // What to do after replacement
    );
  }
  return CONTINUE;
});
```

### DELETE

Remove any property or array element:

```ts
visit(data, (value) => {
  if (value === "remove-me") {
    return DELETE; // Removes the property or array element containing this value
  }
  return CONTINUE;
});
```

### DELETE with Flow Control

You can combine DELETE with flow control:

```ts
import { DELETE_BREAK, DELETE_EXIT } from "jsr:@luma-dev/visit-ts";

visit(data, (value) => {
  if (value === "remove-and-break") {
    return DELETE_BREAK; // Delete and stop processing siblings
  }
  if (value === "remove-and-exit") {
    return DELETE_EXIT; // Delete and exit traversal
  }
  return CONTINUE;
});
```

## Parent Information

Access parent objects and property keys during traversal:

```ts
visit(data, (value, parents) => {
  if (parents.length > 0) {
    const immediate_parent = parents[parents.length - 1];
    console.log(
      `Value ${value} is at key '${immediate_parent.key}' in parent:`,
      immediate_parent.node,
    );
  }
  return CONTINUE;
});
```

## Async Traversal

For asynchronous operations during traversal:

```ts
import { visitAsync } from "jsr:@luma-dev/visit-ts";

await visitAsync(data, async (value) => {
  if (typeof value === "string" && value.startsWith("http")) {
    const response = await fetch(value);
    const data = await response.json();
    return REPLACE(data, CONTINUE);
  }
  return CONTINUE;
});
```

## Advanced Example

Complex data transformation with multiple operations:

```ts
const userData = {
  users: [
    {
      name: "Alice",
      email: "old_alice@example.com",
      settings: { theme: "dark", notifications: true },
    },
    {
      name: "Bob",
      email: "old_bob@example.com",
      settings: { theme: "light", notifications: false },
    },
  ],
  metadata: {
    version: "1.0.0",
    deprecated: true,
    lastUpdate: "2024-01-01",
  },
};

visit(userData, (value, parents) => {
  // Update email domains
  if (typeof value === "string" && value.includes("old_")) {
    return REPLACE(value.replace("old_", "new_"), CONTINUE);
  }

  // Remove deprecated flags
  if (value === true && parents.length > 0) {
    const parent = parents[parents.length - 1];
    if (parent.key === "deprecated") {
      return DELETE;
    }
  }

  // Convert theme settings to numbers
  if (value === "dark") {
    return REPLACE(1, CONTINUE);
  }
  if (value === "light") {
    return REPLACE(0, CONTINUE);
  }

  return CONTINUE;
});
```

## Type Safety

The library provides excellent TypeScript support with recursive type inference:

```ts
type MyDataStructure = {
  id: string;
  items: { name: string; count: number }[];
  config?: { enabled: boolean };
};

const data: MyDataStructure = {
  id: "test",
  items: [{ name: "item1", count: 5 }],
  config: { enabled: true },
};

// TypeScript automatically infers the correct value types
visit(data, (value) => {
  // `value` includes all possible types in the data structure (see limitations)
  if (typeof value === "string") {
    console.log("String value:", value);
  }
  if (typeof value === "number") {
    console.log("Number value:", value);
  }
  return CONTINUE;
});
```

## API Reference

### Functions

- `visit<T>(data: T, visitor: VisitorFunction): void` - Synchronous data
  structure traversal
- `visitAsync<T>(data: T, visitor: AsyncVisitorFunction): Promise<void>` -
  Asynchronous data structure traversal

### Flow Control Constants

- `CONTINUE` - Continue to nested properties/elements
- `STEP_OVER` - Skip nested properties/elements
- `BREAK` - Stop processing siblings
- `EXIT` - Exit entire traversal
- `DELETE` - Delete property/element and continue
- `DELETE_BREAK` - Delete property/element and break
- `DELETE_EXIT` - Delete property/element and exit

### Flow Control Functions

- `REPLACE(value: unknown, then: FlowControl)` - Replace value with new value

## Limitations

### TypeScript Type Inference Depth

The library uses recursive TypeScript types to infer all possible value types in your data structure. Type inference is limited to approximately **10 levels of nesting**. Beyond this depth:

- Runtime traversal continues to work correctly at any depth
- TypeScript may not infer the exact types for deeply nested values
- The visitor function parameter will fall back to `unknown` type for very deep structures

**Example:**
```ts
// Types are fully inferred up to ~10 levels deep
const deepData = {
  level1: {
    level2: {
      level3: {
        // ... up to level10: still typed correctly
        level10: {
          level11: "deeply nested" // May be typed as 'unknown'
        }
      }
    }
  }
};
```

This limitation only affects TypeScript's static type checking - the runtime behavior remains fully functional at any nesting depth.

## Development

```bash
# Run tests
deno test

# Format code
deno fmt

# Type check
deno check mod.ts

# Lint
deno lint
```

## License

CC0-1.0 - Public Domain
