import { TSESTree, type AST } from "@typescript-eslint/typescript-estree"
import { attachComments } from "estree-util-attach-comments"
import type { Parser, ParserOptions } from "prettier"
import { parsers as typescriptParsers } from "prettier/plugins/typescript"

/**
 * Configuration options for the plugin
 * @typedef {Object} ThrowErrorOptions
 * @property {boolean} highlightThrows - Whether to add comments highlighting all throw statements
 * @property {string[]} allowedErrorClasses - List of allowed error classes that can be thrown
 * @property {boolean} enforceAllowedClasses - Whether to enforce that only allowed classes are thrown
 * @property {string[]} include - List of file glob patterns to include
 * @property {string[]} exclude - List of file glob patterns to exclude
 */

interface ThrowErrorOptions {
  highlightThrows?: boolean
  allowedErrorClasses?: string[]
  enforceAllowedClasses?: boolean
  include?: string[]
  exclude?: string[]
}

/**
 * Verifies if the thrown expression is one of the allowed error classes
 * @param {Object} throwExpr - The throw expression node
 * @param {string[]} allowedClasses - Array of allowed error class names
 * @returns {boolean} - Whether the thrown expression is allowed
 */
function isAllowedErrorClass(throwExpr: TSESTree.ThrowStatement, allowedClasses: string[]) {
  if (!throwExpr.argument) return false

  const arg = throwExpr.argument

  // Check for direct instantiation: throw new Error()
  if (arg.type === "NewExpression" && arg.callee && "name" in arg.callee && arg.callee.name) {
    return allowedClasses.includes(arg.callee.name)
  }

  // Check for variable reference: const err = new Error(); throw err;
  if (arg.type === "Identifier") {
    // This is challenging from a static analysis perspective
    // A full implementation would need to track variable assignments
    return true // Allow identifiers, but a more robust solution would trace their values
  }

  return false
}

/**
 * Process all throw statements in the AST
 * @param {Object} ast - The parsed Abstract Syntax Tree
 * @param {ThrowErrorOptions} options - Plugin options
 * @returns {Object} - The modified AST
 */
async function processThrowStatements(ast: TSESTree.Program, options: ThrowErrorOptions, filePath: string) {
  const defaultOptions = {
    highlightThrows: false,
    allowedErrorClasses: [],
    enforceAllowedClasses: false,
    include: [],
    exclude: [],
  }

  if (typeof options.include === "string") {
    options.include = JSON.parse(options.include)
  }

  if (typeof options.exclude === "string") {
    options.exclude = JSON.parse(options.exclude)
  }

  if (typeof options.allowedErrorClasses === "string") {
    options.allowedErrorClasses = JSON.parse(options.allowedErrorClasses)
  }

  const pluginOptions = { ...defaultOptions, ...options }

  const micromatch = await import("micromatch")

  const shouldInclude = pluginOptions.include ? micromatch.isMatch(filePath, pluginOptions.include) : true
  const shouldExclude = pluginOptions.exclude ? micromatch.isMatch(filePath, pluginOptions.exclude) : false
  // Skip processing if the file doesn't match our globs
  if (!shouldInclude || shouldExclude) {
    return ast
  }

  ast.comments

  function traverse(node: TSESTree.Node | TSESTree.Node[keyof TSESTree.Node] | number | null | undefined) {
    if (!node || typeof node !== "object" || Array.isArray(node) || "start" in node) {
      return
    }

    function hasComment(newComment: TSESTree.Comment) {
      return ast.comments?.some((comment) => {
        return comment.loc.start.line === newComment.loc.start.line - 1 && comment.value === newComment.value
      })
    }

    // Process ThrowStatement nodes
    if (node.type === "ThrowStatement") {
      if (pluginOptions.highlightThrows) {
        const comment: TSESTree.Comment = {
          type: TSESTree.AST_TOKEN_TYPES.Block,
          value: " THROW STATEMENT ",
          loc: node.loc,
          range: node.range,
        }

        if (!hasComment(comment)) {
          attachComments(ast as import("estree").Node, [comment])
        }
      }

      if (pluginOptions.enforceAllowedClasses) {
        const isAllowed = isAllowedErrorClass(node, pluginOptions.allowedErrorClasses)

        if (!isAllowed) {
          // Add a warning comment
          //   if (!node.leadingComments) {
          //     node.leadingComments = []
          //   }

          const allowedClassesStr = pluginOptions.allowedErrorClasses.join(", ")
          const comment: TSESTree.Comment = {
            type: TSESTree.AST_TOKEN_TYPES.Block,
            value: ` WARNING: Only throw instances of: ${allowedClassesStr} `,
            loc: node.loc,
            range: node.range,
          }

          if (!hasComment(comment)) {
            attachComments(ast as import("estree").Node, [
              {
                type: "Block",
                value: ` WARNING: Only throw instances of: ${allowedClassesStr} `,
                loc: node.loc,
                range: node.range,
              },
            ])
          }
        }
      }
    }

    // Recursively traverse all properties
    for (const key in node) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const child = node[key as keyof typeof node]

        if (Array.isArray(child)) {
          for (const item of child) {
            traverse(item)
          }
          continue
        } else {
          traverse(child)
        }
      }
    }
  }

  traverse(ast)
  return ast
}

// Create parsers that wrap the built-in parsers
function createWrappedParsers(originalParsers: Record<string, Parser<AST<{}>>>) {
  const wrappedParsers: Record<string, Parser<AST<{}>>> = {}

  for (const parserName in originalParsers) {
    const originalParser = originalParsers[parserName]

    wrappedParsers[parserName] = {
      ...originalParser,
      parse: async (text: string, options: ParserOptions) => {
        const ast = await Promise.resolve(originalParser.parse(text, options))

        return processThrowStatements(ast, (options ?? {}) as ThrowErrorOptions, options.filepath)
      },
    }
  }

  return wrappedParsers
}

export const parsers = {
  ...createWrappedParsers(typescriptParsers),
}

export const options = {
  highlightThrows: {
    type: "boolean",
    default: false,
    description: "Whether to add comments highlighting all throw statements",
    category: "Global",
  },
  allowedErrorClasses: {
    type: "string",
    default: "[]",
    description: "List of allowed error classes that can be thrown",
    category: "Global",
  },
  enforceAllowedClasses: {
    type: "boolean",
    default: true,
    description: "Whether to enforce that only allowed classes are thrown",
    category: "Global",
  },
  include: {
    type: "string",
    default: `["**/*.ts", "**/*.tsx"]`,
    description: "Glob patterns for files to include",
    category: "Global",
  },
  exclude: {
    type: "string",
    default: `[]`,
    description: "Glob patterns for files to exclude",
    category: "Global",
  },
}

// Export the plugin
export default {
  parsers,
  options,
}
