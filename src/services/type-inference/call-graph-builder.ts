/**
 * CallGraphBuilder implementation
 * Single Responsibility: Building function call relationships
 */

import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { ICallGraphBuilder, CallGraphResult, FunctionInfo, CallSite } from '../../interfaces';
import { InferredType } from '../../types';

export class CallGraphBuilder implements ICallGraphBuilder {
  /**
   * Build the call graph from the AST
   */
  public buildCallGraph(ast: t.File): CallGraphResult {
    const functions: Map<string, FunctionInfo> = new Map();
    const callSites: CallSite[] = [];

    // First pass: collect all function definitions
    this.collectFunctions(ast, functions);

    // Second pass: collect call sites and build relationships
    this.collectCallSites(ast, functions, callSites);

    return { functions, callSites };
  }

  /**
   * Collect all function definitions
   */
  private collectFunctions(ast: t.File, functions: Map<string, FunctionInfo>): void {
    traverse(ast, {
      FunctionDeclaration: (path) => {
        if (path.node.id) {
          const funcName = path.node.id.name;
          const params = path.node.params
            .filter(p => t.isIdentifier(p))
            .map(p => (p as t.Identifier).name);

          functions.set(funcName, {
            name: funcName,
            path,
            params,
            callees: new Set(),
            callers: new Set()
          });
        }
      }
    });
  }

  /**
   * Collect all call sites and build caller-callee relationships
   */
  private collectCallSites(
    ast: t.File,
    functions: Map<string, FunctionInfo>,
    callSites: CallSite[]
  ): void {
    traverse(ast, {
      CallExpression: (path) => {
        const callee = path.node.callee;
        if (!t.isIdentifier(callee)) return;

        const calleeName = callee.name;

        // Create call site with initial argument types
        const argumentTypes: (InferredType | null)[] = path.node.arguments.map(arg => {
          if (t.isNode(arg) && !t.isSpreadElement(arg)) {
            return this.inferBasicType(arg);
          }
          return null;
        });

        callSites.push({
          callee: calleeName,
          argumentTypes,
          path
        });

        // Update call graph relationships
        const parentFunc = this.findContainingFunction(path);
        if (parentFunc && functions.has(parentFunc)) {
          functions.get(parentFunc)!.callees.add(calleeName);
          if (functions.has(calleeName)) {
            functions.get(calleeName)!.callers.add(parentFunc);
          }
        }
      }
    });
  }

  /**
   * Find the name of the function containing this path
   */
  private findContainingFunction(path: NodePath): string | null {
    let current = path.parentPath;
    while (current) {
      if (current.isFunctionDeclaration() && current.node.id) {
        return current.node.id.name;
      }
      current = current.parentPath;
    }
    return null;
  }

  /**
   * Infer basic type from a node (for initial call site analysis)
   */
  private inferBasicType(node: t.Node): InferredType | null {
    switch (node.type) {
      case 'StringLiteral':
        return { typeName: 'string', confidence: 1.0 };
      case 'NumericLiteral':
        return { typeName: 'number', confidence: 1.0 };
      case 'BooleanLiteral':
        return { typeName: 'boolean', confidence: 1.0 };
      case 'ArrayExpression':
        return { typeName: 'any[]', confidence: 0.8 };
      case 'ObjectExpression':
        return { typeName: 'object', confidence: 0.8 };
      default:
        return null;
    }
  }
}
