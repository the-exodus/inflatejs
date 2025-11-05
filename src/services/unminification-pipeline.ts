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
              } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
                // Handle destructuring parameters
                let patternType = this.buildTypeForPattern(param, typeMap);

                // If no types found, build a pattern type with 'any' for all properties
                if (!patternType && !param.typeAnnotation) {
                  if (t.isObjectPattern(param)) {
                    const anyProps: string[] = [];
                    param.properties.forEach((prop: any) => {
                      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                        anyProps.push(`${prop.key.name}: any`);
                      } else if (t.isRestElement(prop)) {
                        // Rest elements don't need explicit type in the pattern
                      }
                    });
                    if (anyProps.length > 0) {
                      patternType = `{ ${anyProps.join(', ')} }`;
                    }
                  } else if (t.isArrayPattern(param)) {
                    const anyElements = param.elements.map(() => 'any');
                    patternType = `[${anyElements.join(', ')}]`;
                  }
                }

                if (patternType && !param.typeAnnotation) {
                  param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(patternType);
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
            } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
              // Handle destructuring parameters
              let patternType = this.buildTypeForPattern(param, typeMap);

              // If no types found, build a pattern type with 'any' for all properties
              if (!patternType && !param.typeAnnotation) {
                if (t.isObjectPattern(param)) {
                  const anyProps: string[] = [];
                  param.properties.forEach((prop: any) => {
                    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                      anyProps.push(`${prop.key.name}: any`);
                    } else if (t.isRestElement(prop)) {
                      // Rest elements don't need explicit type in the pattern
                    }
                  });
                  if (anyProps.length > 0) {
                    patternType = `{ ${anyProps.join(', ')} }`;
                  }
                } else if (t.isArrayPattern(param)) {
                  const anyElements = param.elements.map(() => 'any');
                  patternType = `[${anyElements.join(', ')}]`;
                }
              }

              if (patternType && !param.typeAnnotation) {
                param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(patternType);
              }
            }
          });
        }
      },

      // Add type annotations to arrow functions
      ArrowFunctionExpression: (path: any) => {
        // Add type annotations to parameters
        path.node.params.forEach((param: any) => {
          if (t.isIdentifier(param) && !param.typeAnnotation) {
            // Check if we have an inferred type for this parameter
            const paramType = typeMap.get(param.name);
            if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any') {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
            } else {
              // Default to 'any' if no inferred type
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            }
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
          } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
            // Handle destructuring parameters
            const patternType = this.buildTypeForPattern(param, typeMap);
            if (patternType && !param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(patternType);
            }
          }
        });
      },

      // Add type annotations to function expressions
      FunctionExpression: (path: any) => {
        // Add type annotations to parameters
        path.node.params.forEach((param: any) => {
          if (t.isIdentifier(param) && !param.typeAnnotation) {
            // Check if we have an inferred type for this parameter
            const paramType = typeMap.get(param.name);
            if (paramType && paramType.confidence >= 0.7 && paramType.typeName !== 'any') {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(paramType.typeName);
            } else {
              // Default to 'any' if no inferred type
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation('any');
            }
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
          } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
            // Handle destructuring parameters
            const patternType = this.buildTypeForPattern(param, typeMap);
            if (patternType && !param.typeAnnotation) {
              param.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(patternType);
            }
          }
        });
      },

      // Add type annotations to variable declarations
      VariableDeclarator: (path: any) => {
        if (t.isIdentifier(path.node.id)) {
          const varName = path.node.id.name;
          const varType = typeMap.get(varName);

          // Lower threshold for variables (0.5) to allow chained method calls
          // Each method in a chain applies a 0.9 confidence penalty, so after 3 methods
          // we're at 0.729, and after array transformation callbacks we can be around 0.6-0.65
          // Skip 'void' type as it's usually inaccurate for variables (indicates missing return type inference)
          if (varType && varType.confidence >= 0.5 && varType.typeName !== 'any' && varType.typeName !== 'void') {
            path.node.id.typeAnnotation = this.tsTypeBuilder.createTypeAnnotation(varType.typeName);
          }
        }
        // Note: We intentionally don't add pattern type annotations to variable declarators
        // because they can cause TypeScript compilation errors when the source type doesn't
        // match (e.g., source typed as generic 'object' vs specific shape).
        // TypeScript can infer the types of destructured variables from the source.
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
   * Build a type annotation string for a destructuring pattern
   */
  private buildTypeForPattern(pattern: t.ObjectPattern | t.ArrayPattern, typeMap: TypeMap): string | null {
    if (t.isObjectPattern(pattern)) {
      const properties: string[] = [];
      let hasValidTypes = false;

      for (const prop of pattern.properties) {
        if (t.isObjectProperty(prop)) {
          // Get property name
          let propertyName: string | null = null;
          if (t.isIdentifier(prop.key)) {
            propertyName = prop.key.name;
          } else if (t.isStringLiteral(prop.key)) {
            propertyName = prop.key.value;
          }

          if (!propertyName) continue;

          // Get the variable name being destructured
          let varName: string | null = null;
          if (t.isIdentifier(prop.value)) {
            varName = prop.value.name;
          } else if (t.isAssignmentPattern(prop.value) && t.isIdentifier(prop.value.left)) {
            varName = prop.value.left.name;
          }

          if (varName) {
            const varType = typeMap.get(varName);
            if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any') {
              properties.push(`${propertyName}: ${varType.typeName}`);
              hasValidTypes = true;
            } else {
              properties.push(`${propertyName}: any`);
            }
          }
        }
      }

      if (hasValidTypes && properties.length > 0) {
        return `{ ${properties.join(', ')} }`;
      }
    } else if (t.isArrayPattern(pattern)) {
      const elementTypes: string[] = [];
      let hasValidTypes = false;

      for (const element of pattern.elements) {
        if (!element) {
          elementTypes.push('any'); // Hole in array
          continue;
        }

        let varName: string | null = null;
        if (t.isIdentifier(element)) {
          varName = element.name;
        } else if (t.isAssignmentPattern(element) && t.isIdentifier(element.left)) {
          varName = element.left.name;
        }

        if (varName) {
          const varType = typeMap.get(varName);
          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any') {
            elementTypes.push(varType.typeName);
            hasValidTypes = true;
          } else {
            elementTypes.push('any');
          }
        } else {
          elementTypes.push('any');
        }
      }

      if (hasValidTypes && elementTypes.length > 0) {
        return `[${elementTypes.join(', ')}]`;
      }
    }

    return null;
  }

  /**
   * Update typeMap to use renamed variable names instead of original names
   * This is necessary because type inference happens before variable renaming
   */
  private updateTypeMapWithRenamedVariables(ast: any, oldTypeMap: TypeMap): TypeMap {
    const newTypeMap: TypeMap = new Map();
    const renameMappings = this.scopeManager.getAllRenameMappings();

    // Start with the basic flat mapping approach (works for most variables)
    for (const [originalName, typeInfo] of oldTypeMap.entries()) {
      const renamedName = renameMappings.get(originalName);

      if (renamedName) {
        // Variable was renamed, use the new name
        newTypeMap.set(renamedName, typeInfo);
      } else {
        // Variable was not renamed, keep original name
        newTypeMap.set(originalName, typeInfo);
      }
    }

    // Now handle function parameters with scope-aware lookup
    // This fixes the issue where multiple parameters have the same original name in different scopes
    traverse(ast, {
      ArrowFunctionExpression: (path: any) => {
        this.updateParameterTypes(path.node.params, path.scope, oldTypeMap, newTypeMap);
      },
      FunctionExpression: (path: any) => {
        this.updateParameterTypes(path.node.params, path.scope, oldTypeMap, newTypeMap);
      },
      FunctionDeclaration: (path: any) => {
        this.updateParameterTypes(path.node.params, path.scope, oldTypeMap, newTypeMap);
      }
    });

    return newTypeMap;
  }

  /**
   * Update parameter types using scope-aware binding lookup
   */
  private updateParameterTypes(params: any[], scope: any, oldTypeMap: TypeMap, newTypeMap: TypeMap): void {
    for (const param of params) {
      if (t.isIdentifier(param)) {
        const currentName = param.name;
        const binding = scope.getBinding(currentName);

        if (binding && binding.identifier) {
          const originalName = (binding.identifier as any)._originalName || currentName;

          if (originalName !== currentName) {
            const typeInfo = oldTypeMap.get(originalName);
            if (typeInfo) {
              // Update the mapping for this specific renamed parameter
              newTypeMap.set(currentName, typeInfo);
            }
          }
        }
      }
    }
  }

}
