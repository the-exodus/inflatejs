/**
 * ASTTransformer implementation
 * Single Responsibility: Transforming AST (renaming, expanding syntax)
 * Open/Closed: Can be extended with new transformation strategies
 */

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { IASTTransformer, TransformOptions, IScopeManager, INameGenerator } from '../interfaces';

export class ASTTransformer implements IASTTransformer {
  /**
   * Transform the AST by applying various transformations
   * @param ast - The AST to transform
   * @param options - Transformation options
   * @returns Transformed AST
   */
  public transform(ast: t.File, options: TransformOptions): t.File {
    const { renameVariables, scopeManager, nameGenerator } = options;

    if (renameVariables && scopeManager && nameGenerator) {
      this.renameIdentifiers(ast, scopeManager);
    }

    this.expandSyntax(ast);

    return ast;
  }

  /**
   * Rename minified identifiers to more meaningful names
   */
  private renameIdentifiers(ast: t.File, scopeManager: IScopeManager): void {
    traverse(ast, {
      FunctionDeclaration: (path) => {
        if (!path.node.id) return;

        const scopeId = path.scope.uid.toString();

        // Rename parameters
        path.node.params.forEach((param, index) => {
          if (t.isIdentifier(param)) {
            const newName = scopeManager.getOrCreateMapping(param.name, scopeId, {
              isParameter: true,
              parameterIndex: index,
              scope: scopeId
            });

            if (newName !== param.name) {
              path.scope.rename(param.name, newName);
            }
          }
        });
      },

      FunctionExpression: (path) => {
        const scopeId = path.scope.uid.toString();

        // Rename parameters
        path.node.params.forEach((param, index) => {
          if (t.isIdentifier(param)) {
            const newName = scopeManager.getOrCreateMapping(param.name, scopeId, {
              isParameter: true,
              parameterIndex: index,
              scope: scopeId
            });

            if (newName !== param.name) {
              path.scope.rename(param.name, newName);
            }
          }
        });
      },

      ArrowFunctionExpression: (path) => {
        const scopeId = path.scope.uid.toString();

        // Rename parameters
        path.node.params.forEach((param, index) => {
          if (t.isIdentifier(param)) {
            const newName = scopeManager.getOrCreateMapping(param.name, scopeId, {
              isParameter: true,
              parameterIndex: index,
              scope: scopeId
            });

            if (newName !== param.name) {
              path.scope.rename(param.name, newName);
            }
          }
        });
      }
    });
  }

  /**
   * Expand condensed syntax for better readability
   */
  private expandSyntax(ast: t.File): void {
    traverse(ast, {
      // Expand arrow functions with implicit returns
      ArrowFunctionExpression: (path) => {
        if (!t.isBlockStatement(path.node.body)) {
          const returnStatement = t.returnStatement(path.node.body as t.Expression);
          path.node.body = t.blockStatement([returnStatement]);
          path.node.expression = false;
        }
      },

      // Expand function expressions with implicit returns
      FunctionExpression: (path) => {
        if (!t.isBlockStatement(path.node.body)) {
          const returnStatement = t.returnStatement(path.node.body as t.Expression);
          path.node.body = t.blockStatement([returnStatement]);
        }
      },

      // Expand shorthand object properties
      ObjectProperty: (path) => {
        if (path.node.shorthand && t.isIdentifier(path.node.key)) {
          path.node.shorthand = false;
          path.node.value = t.identifier(path.node.key.name);
        }
      }
    });
  }
}
