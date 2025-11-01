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
   * Infer types for all variables and functions in the AST
   * Coordinates the four-step process:
   * 1. Collect initial types from declarations
   * 2. Build call graph
   * 3. Analyze variable usage
   * 4. Resolve final types
   */
  public inferTypes(ast: t.File): TypeMap {
    // Step 1: Collect initial types from declarations
    const typeMap = this.typeCollector.collectTypes(ast);

    // Step 2: Build call graph
    const callGraph = this.callGraphBuilder.buildCallGraph(ast);

    // Step 3: Analyze variable usage patterns
    const usageMap = this.usageAnalyzer.analyzeUsage(ast, typeMap);

    // Step 4: Resolve final types using all collected information
    // Pass AST to resolver for variable type updates
    if ('setCurrentAst' in this.typeResolver) {
      (this.typeResolver as any).setCurrentAst(ast);
    }

    return this.typeResolver.resolveTypes(typeMap, usageMap, callGraph);
  }
}
