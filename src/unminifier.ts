import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import prettier from 'prettier';
import { NodePath } from '@babel/traverse';
import { TypeInferer } from './type-inferer';
import { TypeMap } from './types';

// Map of common parameter names for better readability
const suggestedNames: Record<string, string[]> = {
  // Common parameter names based on position
  params: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
  // Common suggested replacement names
  replacements: ['param', 'value', 'item', 'element', 'result', 'data', 'input', 'output', 'index', 'temp', 'count', 'sum', 'total']
};

/**
 * Configuration options for the unminifier
 */
export interface UnminifyOptions {
  renameVariables?: boolean;
  inferTypes?: boolean;
  outputFormat?: 'js' | 'ts';
}

/**
 * Unminifies JavaScript code by parsing, transforming, and reformatting it.
 * 
 * @param code The minified JavaScript code to unminify
 * @param options Configuration options for the unminifier
 * @returns The unminified, readable JavaScript or TypeScript code
 */
export async function unminify(code: string, options: UnminifyOptions = {}): Promise<string> {
  // Default options
  const config = {
    renameVariables: true,
    inferTypes: false,
    outputFormat: 'js',
    ...options
  };

  // Step 1: Parse the code into an AST (Abstract Syntax Tree)
  const ast = parser.parse(code, {
    sourceType: 'module',
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    startLine: 1,
    plugins: ['jsx', 'typescript', 'classProperties', 'dynamicImport', 'optionalChaining']
  });

  // Create a map to store variable name mappings for each scope
  const scopeNameMaps = new Map<string, Record<string, string>>();
  const nameCounter: Record<string, number> = {};

  // Storage for inferred types
  let inferredTypes: TypeMap = new Map();

  // Function to generate a unique name for a variable
  const generateName = (originalName: string, nameCounter: Record<string, number>, suggestedNames: Record<string, string[]>): string => {
    const baseIndex = suggestedNames.params.indexOf(originalName);
    const baseName = baseIndex >= 0 && baseIndex < suggestedNames.replacements.length 
      ? suggestedNames.replacements[baseIndex] 
      : 'var';
    nameCounter[baseName] = (nameCounter[baseName] || 0) + 1;
    return nameCounter[baseName] > 1 
      ? `${baseName}${nameCounter[baseName]}` 
      : baseName;
  };

  // Function to handle renaming of variables
  const handleVariableRenaming = (path: NodePath<t.Identifier>, scopeNameMaps: Map<string, Record<string, string>>, nameCounter: Record<string, number>, suggestedNames: Record<string, string[]>) => {
    if (path.parentPath.isObjectProperty() && path.parentKey === 'key') {
      return;
    }
    const originalName = path.node.name;
    if (/^[a-z]$|^[a-z][0-9]+$/.test(originalName)) {
      const binding = path.scope.getBinding(originalName);
      if (binding) {
        const scopeId = binding.scope.uid.toString();
        if (scopeNameMaps.has(scopeId)) {
          const nameMap = scopeNameMaps.get(scopeId)!;
          if (nameMap[originalName]) {
            path.node.name = nameMap[originalName];
          }
        }
      }
    }
  };

  // First pass: collect all declarations and assign new names
  traverse(ast, {
    VariableDeclarator(path) {
      if (!config.renameVariables) return;
      
      if (path.node.id.type === 'Identifier') {
        const originalName = path.node.id.name;
        
        // Only rename minified-looking variables (single letters or short names with numbers)
        if (/^[a-z]$|^[a-z][0-9]+$/.test(originalName)) {
          const scopeId = path.scope.uid.toString();
          
          if (!scopeNameMaps.has(scopeId)) {
            scopeNameMaps.set(scopeId, {});
          }
          
          const nameMap = scopeNameMaps.get(scopeId)!;
          if (!nameMap[originalName]) {
            nameMap[originalName] = generateName(originalName, nameCounter, suggestedNames);
          }
        }
      }
    },
    
    FunctionDeclaration(path) {
      if (!config.renameVariables) return;
      
      const scopeId = path.scope.uid.toString();
      if (!scopeNameMaps.has(scopeId)) {
        scopeNameMaps.set(scopeId, {});
      }
      
      const nameMap = scopeNameMaps.get(scopeId)!;
      
      // Handle function name
      if (path.node.id) {
        const originalName = path.node.id.name;
        if (/^[a-z]$|^[a-z][0-9]+$/.test(originalName) && !nameMap[originalName]) {
          nameMap[originalName] = generateName(originalName, nameCounter, suggestedNames);
        }
      }
      
      // Handle parameters
      path.node.params.forEach(param => {
        if (param.type === 'Identifier') {
          const originalName = param.name;
          if (/^[a-z]$|^[a-z][0-9]+$/.test(originalName) && !nameMap[originalName]) {
            nameMap[originalName] = generateName(originalName, nameCounter, suggestedNames);
          }
        }
      });
    },
    
    FunctionExpression(path) {
      if (!config.renameVariables) return;
      
      const scopeId = path.scope.uid.toString();
      if (!scopeNameMaps.has(scopeId)) {
        scopeNameMaps.set(scopeId, {});
      }
      
      const nameMap = scopeNameMaps.get(scopeId)!;
      
      // Handle parameters
      path.node.params.forEach(param => {
        if (param.type === 'Identifier') {
          const originalName = param.name;
          if (/^[a-z]$|^[a-z][0-9]+$/.test(originalName) && !nameMap[originalName]) {
            nameMap[originalName] = generateName(originalName, nameCounter, suggestedNames);
          }
        }
      });
    },
    
    ArrowFunctionExpression(path) {
      if (!config.renameVariables) return;
      
      const scopeId = path.scope.uid.toString();
      if (!scopeNameMaps.has(scopeId)) {
        scopeNameMaps.set(scopeId, {});
      }
      
      const nameMap = scopeNameMaps.get(scopeId)!;
      
      // Handle parameters
      path.node.params.forEach(param => {
        if (param.type === 'Identifier') {
          const originalName = param.name;
          if (/^[a-z]$|^[a-z][0-9]+$/.test(originalName) && !nameMap[originalName]) {
            nameMap[originalName] = generateName(originalName, nameCounter, suggestedNames);
          }
        }
      });
    }
  });

  // Second pass: rename all identifiers using the collected mappings
  traverse(ast, {
    Identifier(path) {
      if (!config.renameVariables) return;
      handleVariableRenaming(path, scopeNameMaps, nameCounter, suggestedNames);
    },

    // Format function declarations
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      // Ensure function declaration has a block body
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([t.returnStatement(path.node.body)]);
      }
    },

    // Format function expressions
    FunctionExpression(path: NodePath<t.FunctionExpression>) {
      // Ensure function expression has a block body
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([t.returnStatement(path.node.body)]);
      }
    },

    // Format arrow functions
    ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
      // Convert expression body to block body for better readability
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([t.returnStatement(path.node.body)]);
      }
    },

    // Expand object properties
    ObjectExpression(path: NodePath<t.ObjectExpression>) {
      path.node.properties.forEach(prop => {
        if (t.isObjectProperty(prop) && prop.shorthand) {
          prop.shorthand = false;
        }
      });
    }
  });

  // Perform type inference if requested
  if (config.inferTypes || config.outputFormat === 'ts') {
    const typeInferer = new TypeInferer();
    inferredTypes = typeInferer.inferTypes(ast);
    
    // Add type annotations if output format is TypeScript
    if (config.outputFormat === 'ts') {
      traverse(ast, {
        // Add type annotations to variable declarations
        VariableDeclarator(path) {
          addTypeAnnotationsToVariables(path, inferredTypes);
        },
        
        // Add type annotations to function parameters
        Function(path) {
          addTypeAnnotationsToParameters(path, inferredTypes);
        }
      });
    }
  }

  // Step 3: Generate code from transformed AST
  const { code: transformedCode } = generate(ast, {
    comments: true,
    retainLines: false,
    compact: false,
    concise: false,
    jsescOption: {
      quotes: 'single'
    }
  });

  // Step 4: Apply prettier to further improve formatting
  try {
    const formattedCode = await prettier.format(transformedCode, {
      parser: 'babel',
      printWidth: 80,
      tabWidth: 2,
      singleQuote: true,
      trailingComma: 'es5',
      bracketSpacing: true,
      semi: true,
      arrowParens: 'always',
      endOfLine: 'lf',
      proseWrap: 'always',
      jsxBracketSameLine: false,
    });

    // If TypeScript output is requested, convert JSDoc comments to actual TS types
    if (config.outputFormat === 'ts') {
      return convertToTypeScript(formattedCode, inferredTypes);
    }
    
    return formattedCode;
  } catch (error) {
    // If prettier fails, return the transformed code anyway
    console.warn('Prettier formatting failed, returning basic transformed code.');
    return transformedCode;
  }
}

/**
 * Converts JS code with type annotations in comments to TypeScript
 */
function convertToTypeScript(code: string, typeMap: TypeMap): string {
  // First, add a TypeScript file header
  let tsCode = '// Generated TypeScript code with inferred types\n\n';
  
  // Simple conversion of JSDoc type annotations to TypeScript
  // This is a simplified approach - a complete implementation would use a JS parser
  
  let processedCode = code
    // Convert JSDoc @type comments to TypeScript annotations for variables
    .replace(/\/\/ @type \{([^}]+)\}\s*\n(const|let|var) ([a-zA-Z0-9_$]+)/g, '$2 $3: $1')
    
    // Convert function parameter types
    .replace(/([a-zA-Z0-9_$]+)(\s*)\/\/ : ([a-zA-Z0-9_$|[\]<>]+)/g, '$1: $3$2')
    
    // Convert function return type comments
    .replace(/\/\*\*\s*\n\s*\* @type \{([^}]+)\}\s*\n\s*\*\/\s*\nfunction ([a-zA-Z0-9_$]+)/g, 
             function(_, type, name) {
               // Extract the return type from the function type
               const returnTypeMatch = type.match(/\) => ([^;]+)/);
               const returnType = returnTypeMatch ? returnTypeMatch[1].trim() : 'void';
               
               // Extract parameter types from the function type
               const paramsMatch = type.match(/\(([^)]*)\)/);
               const paramsString = paramsMatch ? paramsMatch[1].trim() : '';
               
               // Re-use the existing parameters in the function signature
               return `function ${name}(/* with types: ${paramsString} */): ${returnType}`;
             });
  
  // Additional direct conversions for variable declarations that weren't annotated via comments
  for (const [varName, inferredType] of typeMap.entries()) {
    if (inferredType.confidence >= 0.7 && inferredType.typeName !== 'any') {
      // For variable declarations: var/let/const name = ...
      const varDeclRegex = new RegExp(`(var|let|const)\\s+(${varName})\\s*=`, 'g');
      processedCode = processedCode.replace(varDeclRegex, `$1 $2: ${inferredType.typeName} =`);
      
      // For function parameters that weren't already annotated
      const funcParamRegex = new RegExp(`function\\s*\\(([^)]*)\\b${varName}\\b([^)]*)\\)`, 'g');
      processedCode = processedCode.replace(funcParamRegex, (match, before, after) => {
        // Only add type if it doesn't already have one
        if (!match.includes(`${varName}:`)) {
          return `function (${before}${varName}: ${inferredType.typeName}${after})`;
        }
        return match;
      });
    }
  }
  
  // Add function return types where missing
  processedCode = processedCode.replace(
    /(function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\))\s*{/g,
    (match, declaration, funcName) => {
      // Check if we have a type for this function
      if (typeMap.has(funcName)) {
        const inferredType = typeMap.get(funcName)!;
        if (inferredType.confidence >= 0.7 && inferredType.typeName.includes('=>')) {
          // Extract return type from function type
          const returnTypeMatch = inferredType.typeName.match(/\) => ([^;]+)/);
          const returnType = returnTypeMatch ? returnTypeMatch[1].trim() : 'any';
          
          // Add return type annotation if not already present
          if (!declaration.includes('): ')) {
            return `${declaration}: ${returnType} {`;
          }
        }
      }
      return match;
    }
  );
  
  return tsCode + processedCode;
}

// Function to add type annotations to variable declarations
const addTypeAnnotationsToVariables = (path: NodePath<t.VariableDeclarator>, inferredTypes: TypeMap) => {
  if (t.isIdentifier(path.node.id)) {
    const varName = path.node.id.name;
    if (inferredTypes.has(varName)) {
      const inferredType = inferredTypes.get(varName)!;
      if (inferredType.confidence >= 0.7 && inferredType.typeName !== 'any') {
        const parentPath = path.parentPath;
        if (parentPath.isVariableDeclarator() && parentPath.parentPath.isVariableDeclaration()) {
          const declaration = parentPath.parentPath.node;
          declaration.leadingComments = declaration.leadingComments || [];
          declaration.leadingComments.push({
            type: 'CommentLine',
            value: ` @type {${inferredType.typeName}}`,
          });
        }
      }
    }
  }
};

// Function to add type annotations to function parameters
const addTypeAnnotationsToParameters = (path: NodePath<t.Function>, inferredTypes: TypeMap) => {
  if (path.isFunctionDeclaration() && path.node.id) {
    const funcName = path.node.id.name;
    if (inferredTypes.has(funcName)) {
      const inferredType = inferredTypes.get(funcName)!;
      if (inferredType.confidence >= 0.7 && inferredType.typeName.includes('=>')) {
        path.node.leadingComments = path.node.leadingComments || [];
        path.node.leadingComments.push({
          type: 'CommentBlock',
          value: `*
 * @type {${inferredType.typeName}}
 `,
        });
      }
    }
  }
  path.node.params.forEach(param => {
    if (t.isIdentifier(param)) {
      const paramName = param.name;
      if (inferredTypes.has(paramName)) {
        const inferredType = inferredTypes.get(paramName)!;
        if (inferredType.confidence >= 0.7 && inferredType.typeName !== 'any') {
          param.trailingComments = param.trailingComments || [];
          param.trailingComments.push({
            type: 'CommentLine',
            value: ` : ${inferredType.typeName}`,
          });
        }
      }
    }
  });
};