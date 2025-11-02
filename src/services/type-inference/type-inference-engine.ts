/**
 * TypeInferenceEngine implementation
 * Single Responsibility: Coordinating the type inference process
 * Dependency Inversion: Depends on abstractions (interfaces), not concrete implementations
 */

import * as t from '@babel/types';
import {
  ITypeInferenceEngine,
  ITypeCollector,
  IUsageAnalyzer,
  ICallGraphBuilder,
  ITypeResolver
} from '../../interfaces';
import { TypeMap } from '../../types';

export class TypeInferenceEngine implements ITypeInferenceEngine {
  constructor(
    private typeCollector: ITypeCollector,
    private usageAnalyzer: IUsageAnalyzer,
    private callGraphBuilder: ICallGraphBuilder,
    private typeResolver: ITypeResolver
  ) {}

  /**
   * Infer types for all variables and functions in the AST using multi-pass iterative refinement
   *
   * Algorithm:
   * 1. Collect initial types from declarations (literals, known constructors)
   * 2. Build call graph (function relationships)
   * 3. Iteratively refine types until convergence:
   *    - Analyze variable usage patterns
   *    - Resolve types based on assignments, calls, and usage
   *    - Propagate types across variables
   *    - Continue until no new type information is discovered
   */
  public inferTypes(ast: t.File): TypeMap {
    // Pass 1: Collect initial types from declarations
    const typeMap = this.typeCollector.collectTypes(ast);

    // Pass 2: Build call graph (stable across iterations)
    const callGraph = this.callGraphBuilder.buildCallGraph(ast);

    // Pass AST to resolver for variable type updates
    if ('setCurrentAst' in this.typeResolver) {
      (this.typeResolver as any).setCurrentAst(ast);
    }

    // Multi-pass iterative refinement
    const maxIterations = 5; // Prevent infinite loops
    let previousTypeMapSnapshot: string | null = null;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Create snapshot of current type map to detect convergence
      const currentSnapshot = this.serializeTypeMap(typeMap);

      // Check for convergence - if no types changed, we're done
      if (currentSnapshot === previousTypeMapSnapshot) {
        break;
      }

      previousTypeMapSnapshot = currentSnapshot;

      // Pass 3.N: Analyze variable usage patterns
      const usageMap = this.usageAnalyzer.analyzeUsage(ast, typeMap);

      // Pass 4.N: Resolve types using all collected information
      this.typeResolver.resolveTypes(typeMap, usageMap, callGraph);
    }

    return typeMap;
  }

  /**
   * Serialize type map for comparison to detect convergence
   */
  private serializeTypeMap(typeMap: TypeMap): string {
    const entries: string[] = [];
    for (const [name, type] of typeMap.entries()) {
      entries.push(`${name}:${type.typeName}:${type.confidence.toFixed(2)}`);
    }
    return entries.sort().join('|');
  }
}
