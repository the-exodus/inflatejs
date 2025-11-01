/**
 * Core interfaces for the unminification system
 * Following SOLID principles for better maintainability
 */

import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { TypeMap, InferredType } from '../types';

/**
 * Interface for parsing JavaScript code into AST
 * Single Responsibility: Only handles code parsing
 */
export interface ICodeParser {
  parse(code: string): t.File;
}

/**
 * Interface for generating code from AST
 * Single Responsibility: Only handles code generation
 */
export interface ICodeGenerator {
  generate(ast: t.File): string;
}

/**
 * Interface for formatting code
 * Single Responsibility: Only handles code formatting
 */
export interface ICodeFormatter {
  format(code: string, parser?: string): string;
}

/**
 * Interface for generating variable names
 * Single Responsibility: Generates meaningful names based on context
 */
export interface INameGenerator {
  generateName(originalName: string, context: NameContext): string;
  reset(): void;
}

/**
 * Context for name generation
 */
export interface NameContext {
  isParameter?: boolean;
  parameterIndex?: number;
  scope?: string;
  parentFunction?: string;
}

/**
 * Interface for managing variable scopes and mappings
 * Single Responsibility: Tracks variable names across scopes
 */
export interface IScopeManager {
  getOrCreateMapping(name: string, scopeId: string, context: NameContext): string;
  hasMapping(name: string, scopeId: string): boolean;
  getMapping(name: string, scopeId: string): string | undefined;
  clear(): void;
}

/**
 * Interface for AST transformation strategies
 * Open/Closed: Open for extension, closed for modification
 */
export interface IASTTransformer {
  transform(ast: t.File, options: TransformOptions): t.File;
}

/**
 * Options for AST transformation
 */
export interface TransformOptions {
  renameVariables?: boolean;
  scopeManager?: IScopeManager;
  nameGenerator?: INameGenerator;
}

/**
 * Interface for type inference
 * Single Responsibility: Infers types from code
 */
export interface ITypeInferenceEngine {
  inferTypes(ast: t.File): TypeMap;
}

/**
 * Interface for collecting type information from AST
 * Single Responsibility: Collects declarations and initial types
 */
export interface ITypeCollector {
  collectTypes(ast: t.File): TypeMap;
}

/**
 * Interface for analyzing variable usage patterns
 * Single Responsibility: Tracks how variables are used
 */
export interface IUsageAnalyzer {
  analyzeUsage(ast: t.File, typeMap: TypeMap): Map<string, Set<string>>;
}

/**
 * Interface for building call graphs
 * Single Responsibility: Builds function call relationships
 */
export interface ICallGraphBuilder {
  buildCallGraph(ast: t.File): CallGraphResult;
}

/**
 * Result of call graph building
 */
export interface CallGraphResult {
  functions: Map<string, FunctionInfo>;
  callSites: CallSite[];
}

/**
 * Information about a function in the call graph
 */
export interface FunctionInfo {
  name: string;
  path: NodePath<t.Function>;
  params: string[];
  returnType?: InferredType;
  callees: Set<string>;
  callers: Set<string>;
}

/**
 * Information about a call site
 */
export interface CallSite {
  callee: string;
  argumentTypes: (InferredType | null)[];
  path: NodePath<t.CallExpression>;
}

/**
 * Interface for resolving types based on collected information
 * Single Responsibility: Resolves final types from usage and inference
 */
export interface ITypeResolver {
  resolveTypes(
    typeMap: TypeMap,
    usageMap: Map<string, Set<string>>,
    callGraph: CallGraphResult
  ): TypeMap;
}

/**
 * Configuration for the unminification pipeline
 */
export interface UnminificationConfig {
  renameVariables?: boolean;
  inferTypes?: boolean;
  outputTypeScript?: boolean;
  maxDepth?: number;
  maxTime?: number;
}

/**
 * Interface for the complete unminification pipeline
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */
export interface IUnminificationPipeline {
  process(code: string, config: UnminificationConfig): string;
}
