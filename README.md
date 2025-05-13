# prettier-plugin-detect-throw

[![npm version](https://badge.fury.io/js/prettier-plugin-detect-throw.svg)](https://badge.fury.io/js/prettier-plugin-detect-throw)

[![NPM](https://nodei.co/npm/prettier-plugin-detect-throw.png?mini=true&downloads=true)](https://nodei.co/npm/prettier-plugin-detect-throw/)

A Prettier plugin that identifies and highlights throw statements in your TypeScript code, optionally enforcing that only specific error classes are thrown.

## Features

- **Highlight Throw Statements**: Add comments above all throw statements for easy identification
- **Enforce Error Classes**: Define allowed error classes and receive warnings for non-compliant throws
- **Flexible Configuration**: Include or exclude files using glob patterns

## Installation

```bash
# Using npm
npm install --save-dev prettier-plugin-detect-throw

# Using yarn
yarn add --dev prettier-plugin-detect-throw

# Using bun
bun add --dev prettier-plugin-detect-throw
```

## Usage

Add the plugin to your Prettier configuration:

```js
// .prettierrc.js
module.exports = {
  plugins: ["prettier-plugin-detect-throw"],
  highlightThrows: true,
  allowedErrorClasses: '["Error", "CustomError", "ValidationError"]',
  enforceAllowedClasses: true,
  include: '["**/*.ts", "**/*.tsx"]',
  exclude: '["**/node_modules/**"]',
}
```

Or as JSON:

```json
{
  "plugins": ["prettier-plugin-detect-throw"],
  "highlightThrows": true,
  "allowedErrorClasses": "[\"Error\", \"CustomError\", \"ValidationError\"]",
  "enforceAllowedClasses": true,
  "include": "[\"**/*.ts\", \"**/*.tsx\"]",
  "exclude": "[\"**/node_modules/**\"]"
}
```

## Configuration Options

| Option                  | Type                | Default                         | Description                                                                   |
| ----------------------- | ------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `highlightThrows`       | boolean             | `false`                         | When true, adds a `/* THROW STATEMENT */` comment above each throw            |
| `allowedErrorClasses`   | string (JSON array) | `"[]"`                          | JSON string array of allowed error class names                                |
| `enforceAllowedClasses` | boolean             | `true`                          | When true, adds warning comments to throws that use non-allowed error classes |
| `include`               | string (JSON array) | `"[\"**/*.ts\", \"**/*.tsx\"]"` | JSON string array of glob patterns for files to include                       |
| `exclude`               | string (JSON array) | `"[]"`                          | JSON string array of glob patterns for files to exclude                       |

## Example

Before:

```typescript
function processData(data) {
  if (!data) {
    throw new Error("Data is required")
  }

  if (!isValid(data)) {
    throw new InvalidDataError("Invalid data format")
  }

  try {
    return transform(data)
  } catch (e) {
    throw e
  }
}
```

After (with `highlightThrows: true` and `allowedErrorClasses: ["Error"]`):

```typescript
function processData(data) {
  if (!data) {
    /* THROW STATEMENT */
    throw new Error("Data is required")
  }

  if (!isValid(data)) {
    /* WARNING: Only throw instances of: Error */
    /* THROW STATEMENT */
    throw new InvalidDataError("Invalid data format")
  }

  try {
    return transform(data)
  } catch (e) {
    /* THROW STATEMENT */
    throw e
  }
}
```

## Development

```bash
# Install dependencies
bun install

# Build as edits are made
bun run watch

# Build once
bun run build

# Typecheck
bun run typecheck
```
