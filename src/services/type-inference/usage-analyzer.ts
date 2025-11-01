/**
 * UsageAnalyzer implementation
 * Single Responsibility: Analyzing how variables are used
 */

import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { IUsageAnalyzer } from '../../interfaces';
import { TypeMap } from '../../types';

export class UsageAnalyzer implements IUsageAnalyzer {
  private readonly stringMethods = [
    'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf',
    'match', 'replace', 'search', 'slice', 'split', 'substr',
    'substring', 'toLowerCase', 'toUpperCase', 'trim'
  ];

  private readonly arrayMethods = [
    'concat', 'every', 'filter', 'find', 'findIndex', 'forEach',
    'includes', 'indexOf', 'join', 'keys', 'map', 'pop', 'push',
    'reduce', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'unshift'
  ];

  /**
   * Analyze how variables are used throughout the code
   */
  public analyzeUsage(ast: t.File, typeMap: TypeMap): Map<string, Set<string>> {
    const usageMap: Map<string, Set<string>> = new Map();

    traverse(ast, {
      Identifier: (path) => {
        this.handleIdentifier(path, typeMap, usageMap);
      }
    });

    return usageMap;
  }

  /**
   * Handle identifier nodes to detect usage patterns
   */
  private handleIdentifier(
    path: NodePath<t.Identifier>,
    typeMap: TypeMap,
    usageMap: Map<string, Set<string>>
  ): void {
    const name = path.node.name;
    if (!path.isReferencedIdentifier() || !typeMap.has(name)) {
      return;
    }

    const parent = path.parent;

    // Binary operations
    if (t.isBinaryExpression(parent) && ['+', '-', '*', '/', '%', '**'].includes(parent.operator)) {
      this.handleBinaryOperation(path, parent, usageMap);
    }

    // Array access
    if (t.isMemberExpression(parent) && parent.object === path.node && t.isNumericLiteral(parent.property)) {
      this.addUsage(name, 'array', usageMap);
    }

    // Method calls
    if (t.isMemberExpression(parent) && t.isIdentifier(parent.property)) {
      const methodName = parent.property.name;
      if (this.stringMethods.includes(methodName)) {
        this.addUsage(name, 'string', usageMap);
      } else if (this.arrayMethods.includes(methodName)) {
        this.addUsage(name, 'array', usageMap);
      }
    }

    // Comparisons
    if (t.isBinaryExpression(parent) && ['==', '===', '!=', '!==', '>', '<', '>=', '<='].includes(parent.operator)) {
      this.handleComparison(path, parent, usageMap);
    }
  }

  /**
   * Handle binary operations
   */
  private handleBinaryOperation(
    path: NodePath<t.Identifier>,
    parent: t.BinaryExpression,
    usageMap: Map<string, Set<string>>
  ): void {
    const name = path.node.name;

    if (parent.operator === '+') {
      // Check if used in numeric context
      const grandParent = path.parentPath?.parent;
      if (grandParent && t.isBinaryExpression(grandParent) && ['*', '/', '-', '%', '**'].includes(grandParent.operator)) {
        this.addUsage(name, 'number', usageMap);
      } else {
        this.addUsage(name, 'number|string', usageMap);
      }
    } else {
      this.addUsage(name, 'number', usageMap);
    }
  }

  /**
   * Handle comparisons with literals
   */
  private handleComparison(
    path: NodePath<t.Identifier>,
    parent: t.BinaryExpression,
    usageMap: Map<string, Set<string>>
  ): void {
    const name = path.node.name;
    const otherSide = parent.left === path.node ? parent.right : parent.left;

    if (t.isStringLiteral(otherSide)) {
      this.addUsage(name, 'string', usageMap);
    } else if (t.isNumericLiteral(otherSide)) {
      this.addUsage(name, 'number', usageMap);
    } else if (t.isBooleanLiteral(otherSide)) {
      this.addUsage(name, 'boolean', usageMap);
    }
  }

  /**
   * Add usage information for a variable
   */
  private addUsage(name: string, usage: string, usageMap: Map<string, Set<string>>): void {
    if (!usageMap.has(name)) {
      usageMap.set(name, new Set());
    }
    usageMap.get(name)!.add(usage);
  }
}
