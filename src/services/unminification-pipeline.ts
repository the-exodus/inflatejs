/**
 * UnminificationPipeline implementation
 * Single Responsibility: Orchestrating the unminification process
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import {
  IUnminificationPipeline,
  ICodeParser,
  ICodeGenerator,
  ICodeFormatter,
  INameGenerator,
  IScopeManager,
  IASTTransformer,
  ITypeInferenceEngine,
  UnminificationConfig
} from '../interfaces';
import { TypeMap } from '../types';
import { TypeScriptTypeBuilder } from './typescript-type-builder';

export class UnminificationPipeline implements IUnminificationPipeline {
  private tsTypeBuilder: TypeScriptTypeBuilder;

  constructor(
    private parser: ICodeParser,
    private transformer: IASTTransformer,
    private typeInferenceEngine: ITypeInferenceEngine | null,
    private generator: ICodeGenerator,
    private formatter: ICodeFormatter,
    private nameGenerator: INameGenerator,
    private scopeManager: IScopeManager
  ) {
    this.tsTypeBuilder = new TypeScriptTypeBuilder();
  }

  /**
   * Process code through the complete unminification pipeline
   * @param code - The minified code to process
   * @param config - Configuration options
   * @returns Unminified code
   */
  public process(code: string, config: UnminificationConfig): string {
    // Step 1: Parse code into AST
    const ast = this.parser.parse(code);

    // Step 2: Infer types if requested
    let typeMap: TypeMap | null = null;
    if (config.inferTypes && this.typeInferenceEngine) {
      typeMap = this.typeInferenceEngine.inferTypes(ast);
    }

    // Step 3: Transform AST (rename variables, expand syntax)
    this.transformer.transform(ast, {
      renameVariables: config.renameVariables,
      scopeManager: this.scopeManager,
      nameGenerator: this.nameGenerator
    });

    // Step 3.5: Update typeMap with renamed variable names
    if (typeMap && config.renameVariables) {
      typeMap = this.updateTypeMapWithRenamedVariables(ast, typeMap);
    }

    // Step 4: Add TypeScript type annotations to AST if requested
    if (config.outputTypeScript) {
      // Create an empty type map if type inference is disabled
      const effectiveTypeMap = typeMap || new Map();
      this.addTypeAnnotations(ast, effectiveTypeMap);
    }

    // Step 5: Generate code from AST (with TypeScript syntax if annotations were added)
    const generatedCode = this.generator.generate(ast);

    // Step 6: Format the code
    const parser = config.outputTypeScript ? 'typescript' : 'babel';
    const formattedCode = this.formatter.format(generatedCode, parser);

    return formattedCode;
  }

  /**
   * Add TypeScript type annotations directly to the AST
   */
  private addTypeAnnotations(ast: any, typeMap: TypeMap): void {
    traverse(ast, {
      // Add type annotations to function declarations
      FunctionDeclaration: (path: any) => {
        if (!path.node.id) return;

        const funcName = path.node.id.name;
        const funcType = typeMap.get(funcName);

        if (funcType && funcType.confidence >= 0.7) {
          // Parse the function type to get parameter types and return type
          const parsedType = this.tsTypeBuilder.parseFunctionType(funcType.typeName);

          if (parsedType) {
            // Add parameter type annotations
            path.node.params.forEach((param: any, index: number) => {
              if (t.isIdentifier(param) && parsedType.paramTypes[index]) {
                const paramTypeStr = parsedType.paramTypes[index];
                param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramTypeStr);
              } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
                // Handle default parameters - check the typeMap for inferred type
                const paramName = param.left.name;
                const paramType = typeMap.get(paramName);
                if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
                  param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
                } else if (parsedType.paramTypes[index] && !param.left.typeAnnotation) {
                  param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(parsedType.paramTypes[index]);
                } else if (!param.left.typeAnnotation) {
                  param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
                }
              } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
                // Handle rest parameters
                const paramName = param.argument.name;
                const paramType = typeMap.get(paramName);
                if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
                  param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
                } else if (!param.typeAnnotation) {
                  param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
                }
              }
            });

            // Add return type annotation
            let returnTypeStr = parsedType.returnType;

            // Wrap return type in Promise<> for async functions
            if (path.node.async && !returnTypeStr.startsWith('Promise<')) {
              returnTypeStr = `Promise<${returnTypeStr}>`;
            }

            path.node.returnType = this.tsTypeBuilder.createTypeAnnotation(returnTypeStr);
          }
        } else {
          // No inferred type - add explicit 'any' to all parameters
          path.node.params.forEach((param: any) => {
            if (t.isIdentifier(param) && !param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
              // Handle default parameters - check the typeMap for inferred type
              const paramName = param.left.name;
              const paramType = typeMap.get(paramName);
              if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
                param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
              } else if (!param.left.typeAnnotation) {
                param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
              }
            } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
              // Handle rest parameters
              const paramName = param.argument.name;
              const paramType = typeMap.get(paramName);
              if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
                param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
              } else if (!param.typeAnnotation) {
                param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
              }
            }
          });
        }
      },

      // Add type annotations to arrow functions
      ArrowFunctionExpression: (path: any) => {
        // Add 'any' type to parameters without type annotations
        path.node.params.forEach((param: any) => {
          if (t.isIdentifier(param) && !param.typeAnnotation) {
            param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
          } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
            // Handle default parameters - check the typeMap for inferred type
            const paramName = param.left.name;
            const paramType = typeMap.get(paramName);
            if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
              param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
            } else if (!param.left.typeAnnotation) {
              param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            }
          } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
            // Handle rest parameters
            const paramName = param.argument.name;
            const paramType = typeMap.get(paramName);
            if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
            } else if (!param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
            }
          }
        });
      },

      // Add type annotations to function expressions
      FunctionExpression: (path: any) => {
        // Add 'any' type to parameters without type annotations
        path.node.params.forEach((param: any) => {
          if (t.isIdentifier(param) && !param.typeAnnotation) {
            param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
          } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
            // Handle default parameters - check the typeMap for inferred type
            const paramName = param.left.name;
            const paramType = typeMap.get(paramName);
            if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
              param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
            } else if (!param.left.typeAnnotation) {
              param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            }
          } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
            // Handle rest parameters
            const paramName = param.argument.name;
            const paramType = typeMap.get(paramName);
            if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
            } else if (!param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
            }
          }
        });
      },

      // Add type annotations to variable declarations
      VariableDeclarator: (path: any) => {
        if (t.isIdentifier(path.node.id)) {
          const varName = path.node.id.name;
          const varType = typeMap.get(varName);

          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any') {
            path.node.id.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        }
        // For patterns, let the Identifier visitor handle individual identifiers
      },

      // Add type annotations to identifiers (including those in destructuring patterns)
      Identifier: (path: any) => {
        // Skip if already has type annotation
        if (path.node.typeAnnotation) {
          return;
        }

        // Only annotate if this identifier is being declared in a pattern
        const parent = path.parent;
        let isInPattern = false;

        // Check if this identifier is the value in an ObjectProperty within an ObjectPattern
        if (t.isObjectProperty(parent) && parent.value === path.node) {
          const grandParent = path.parentPath?.parentPath?.node;
          if (t.isObjectPattern(grandParent)) {
            isInPattern = true;
          }
        }

        // Check if this identifier is directly in an ArrayPattern
        if (t.isArrayPattern(parent)) {
          isInPattern = true;
        }

        // Check if this identifier is in an AssignmentPattern (default value)
        if (t.isAssignmentPattern(parent) && parent.left === path.node) {
          const grandParent = path.parentPath?.parent;
          if (t.isObjectPattern(grandParent) || t.isArrayPattern(grandParent)) {
            isInPattern = true;
          }
        }

        if (isInPattern) {
          const varName = path.node.name;
          const varType = typeMap.get(varName);

          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any') {
            path.node.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        }
      },

      // Add type annotations to class properties and methods
      ClassBody: (path: any) => {
        // First, scan constructor for property assignments and create property declarations
        const constructor = path.node.body.find((member: any) =>
          t.isClassMethod(member) && member.kind === 'constructor'
        );

        const propertiesToAdd = new Set<string>();

        if (constructor && t.isBlockStatement(constructor.body)) {
          // Scan constructor body for this.propName = assignments
          traverse(constructor.body, {
            AssignmentExpression: (assignPath: any) => {
              const left = assignPath.node.left;
              if (t.isMemberExpression(left) &&
                  t.isThisExpression(left.object) &&
                  t.isIdentifier(left.property)) {
                propertiesToAdd.add(left.property.name);
              }
            },
            noScope: true
          });

          // Add type annotations to constructor parameters
          constructor.params.forEach((param: any) => {
            if (t.isIdentifier(param) && !param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
              // Handle default parameters - check the typeMap for inferred type
              const paramName = param.left.name;
              const paramType = typeMap.get(paramName);
              if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
                param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
              } else if (!param.left.typeAnnotation) {
                param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
              }
            } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
              // Handle rest parameters
              const paramName = param.argument.name;
              const paramType = typeMap.get(paramName);
              if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
                param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
              } else if (!param.typeAnnotation) {
                param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
              }
            }
          });
        }

        // Create property declarations and insert them at the beginning of the class
        const propertyDeclarations: any[] = [];
        propertiesToAdd.forEach(propName => {
          const propDecl = t.classProperty(
            t.identifier(propName),
            null,
            this.tsTypeBuilder.createTypeAnnotation('any')
          );
          propertyDeclarations.push(propDecl);
        });

        // Insert property declarations before other members
        if (propertyDeclarations.length > 0) {
          path.node.body = [...propertyDeclarations, ...path.node.body];
        }

        // Handle existing class properties
        path.node.body.forEach((member: any) => {
          if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
            const propName = member.key.name;
            const propType = typeMap.get(propName);

            if (propType && propType.confidence >= 0.7 && !member.typeAnnotation) {
              member.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(propType.typeName);
            } else if (!member.typeAnnotation) {
              // Default to 'any' for properties without inferred types
              member.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            }
          }

          // Handle class methods (non-constructor)
          if (t.isClassMethod(member) && member.kind !== 'constructor' && t.isIdentifier(member.key)) {
            const methodName = member.key.name;
            const methodType = typeMap.get(methodName);

            if (methodType && methodType.confidence >= 0.7) {
              const parsedType = this.tsTypeBuilder.parseFunctionType(methodType.typeName);

              if (parsedType) {
                // Add parameter type annotations
                member.params.forEach((param: any, index: number) => {
                  if (t.isIdentifier(param) && parsedType.paramTypes[index] && !param.typeAnnotation) {
                    param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(parsedType.paramTypes[index]);
                  } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
                    // Handle default parameters
                    const paramName = param.left.name;
                    const paramType = typeMap.get(paramName);
                    if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
                      param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
                    } else if (!param.left.typeAnnotation) {
                      param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
                    }
                  } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
                    // Handle rest parameters
                    const paramName = param.argument.name;
                    const paramType = typeMap.get(paramName);
                    if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
                      param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
                    } else if (!param.typeAnnotation) {
                      param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
                    }
                  }
                });

                // Add return type annotation
                if (!member.returnType) {
                  member.returnType = this.tsTypeBuilder.createTypeAnnotation(parsedType.returnType);
                }
              }
            } else {
              // Add 'any' types to parameters without inferred types
              member.params.forEach((param: any) => {
                if (t.isIdentifier(param) && !param.typeAnnotation) {
                  param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
                } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
                  // Handle default parameters - check the typeMap for inferred type
                  const paramName = param.left.name;
                  const paramType = typeMap.get(paramName);
                  if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any' && !param.left.typeAnnotation) {
                    param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
                  } else if (!param.left.typeAnnotation) {
                    param.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
                  }
                } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
                  // Handle rest parameters
                  const paramName = param.argument.name;
                  const paramType = typeMap.get(paramName);
                  if (paramType && paramType.confidence >= 0.7 && !param.typeAnnotation) {
                    param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
                  } else if (!param.typeAnnotation) {
                    param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any[]');
                  }
                }
              });
            }
          }
        });
      }
    });
  }

  /**
   * Add type annotations to destructuring patterns recursively
   */
  private addTypeAnnotationsToPattern(pattern: t.ObjectPattern | t.ArrayPattern, typeMap: TypeMap): void {
    if (t.isObjectPattern(pattern)) {
      pattern.properties.forEach(prop => {
        if (t.isObjectProperty(prop)) {
          if (t.isIdentifier(prop.value)) {
            // Simple: const { x } = obj
            const varName = prop.value.name;
            const varType = typeMap.get(varName);
            if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any' && !prop.value.typeAnnotation) {
              prop.value.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
            }
          } else if (t.isAssignmentPattern(prop.value) && t.isIdentifier(prop.value.left)) {
            // With default: const { x = 5 } = obj
            const varName = prop.value.left.name;
            const varType = typeMap.get(varName);
            if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any' && !prop.value.left.typeAnnotation) {
              prop.value.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
            }
          } else if (t.isObjectPattern(prop.value) || t.isArrayPattern(prop.value)) {
            // Nested: const { user: { name } } = data
            this.addTypeAnnotationsToPattern(prop.value, typeMap);
          }
        } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
          // Rest: const { x, ...rest } = obj
          const varName = prop.argument.name;
          const varType = typeMap.get(varName);
          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any' && !prop.argument.typeAnnotation) {
            prop.argument.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        }
      });
    } else if (t.isArrayPattern(pattern)) {
      pattern.elements.forEach(element => {
        if (!element) return; // Hole in array

        if (t.isIdentifier(element)) {
          // Simple: const [x, y] = arr
          const varName = element.name;
          const varType = typeMap.get(varName);
          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any' && !element.typeAnnotation) {
            element.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        } else if (t.isAssignmentPattern(element) && t.isIdentifier(element.left)) {
          // With default: const [x = 5] = arr
          const varName = element.left.name;
          const varType = typeMap.get(varName);
          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any' && !element.left.typeAnnotation) {
            element.left.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        } else if (t.isObjectPattern(element) || t.isArrayPattern(element)) {
          // Nested: const [[a, b]] = matrix
          this.addTypeAnnotationsToPattern(element, typeMap);
        } else if (t.isRestElement(element) && t.isIdentifier(element.argument)) {
          // Rest: const [first, ...rest] = arr
          const varName = element.argument.name;
          const varType = typeMap.get(varName);
          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any' && !element.argument.typeAnnotation) {
            element.argument.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        }
      });
    }
  }

  /**
   * Update typeMap to use renamed variable names instead of original names
   * This is necessary because type inference happens before variable renaming
   */
  private updateTypeMapWithRenamedVariables(ast: any, oldTypeMap: TypeMap): TypeMap {
    const newTypeMap: TypeMap = new Map();
    const renameMappings = this.scopeManager.getAllRenameMappings();

    // Update typeMap keys based on rename mappings
    for (const [originalName, typeInfo] of oldTypeMap.entries()) {
      const renamedName = renameMappings.get(originalName);

      if (renamedName) {
        // Variable was renamed, use the new name
        newTypeMap.set(renamedName, typeInfo);
      } else {
        // Variable was not renamed (e.g., non-minified names), keep original name
        newTypeMap.set(originalName, typeInfo);
      }
    }

    return newTypeMap;
  }

}
