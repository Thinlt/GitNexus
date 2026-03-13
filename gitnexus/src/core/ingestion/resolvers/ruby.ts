/**
 * Ruby require/require_relative import resolution.
 * Handles path resolution for Ruby's require and require_relative calls.
 */

import type { SuffixIndex } from './utils.js';
import { suffixResolve } from './utils.js';

/** Bundler config parsed from Gemfile (future: gem path resolution) */
export interface GemfileConfig {
  gemPaths: Map<string, string>;
}

/**
 * Resolve a Ruby require/require_relative path to a matching .rb file.
 *
 * require_relative paths are pre-normalized to './' prefix by the caller.
 * require paths use suffix matching (gem-style paths like 'json', 'net/http').
 */
export function resolveRubyImport(
  sourceFile: string,
  importPath: string,
  isRelative: boolean,
  normalizedFileList: string[],
  allFileList: string[],
  index?: SuffixIndex,
): string | null {
  const pathParts = importPath.replace(/^\.\//, '').split('/').filter(Boolean);
  return suffixResolve(pathParts, normalizedFileList, allFileList, index);
}

/**
 * Extract the import path string from a Ruby call AST node.
 * Returns null if the call is not a require/require_relative.
 */
export function extractRubyImportPath(
  calledName: string,
  callNode: any,
): { importPath: string; isRelative: boolean } | null {
  if (calledName !== 'require' && calledName !== 'require_relative') return null;

  const argList = callNode.childForFieldName?.('arguments');
  const stringNode = argList?.children?.find((c: any) => c.type === 'string');
  const contentNode = stringNode?.children?.find((c: any) => c.type === 'string_content');
  if (!contentNode) return null;

  let importPath = contentNode.text;
  const isRelative = calledName === 'require_relative';
  if (isRelative && !importPath.startsWith('.')) {
    importPath = './' + importPath;
  }

  return { importPath, isRelative };
}
