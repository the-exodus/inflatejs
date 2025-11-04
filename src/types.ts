import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

// Type inference result structure
export interface InferredType {
  // The inferred TypeScript type
  typeName: string;
  // Confidence level (0-1) of the inference
  confidence: number;
  // Object property types (for destructuring support)
  properties?: { [key: string]: InferredType };
}

// Map to store inferred types for each variable/parameter
export type TypeMap = Map<string, InferredType>;

// Interface for the TypeInferer class
export interface ITypeInferer {
  inferTypes(ast: t.File): TypeMap;
}

// Function to infer type from a node based on its structure
export type InferTypeFromNode = (node: t.Node, depth?: number) => InferredType | null;

// Function to infer the return type of a function from its contents
export type InferFunctionReturnType = (path: NodePath<t.Function>, depth?: number) => void;

// Information about a function in the call graph
export interface FunctionInfo {
  // Function name
  name: string;
  // NodePath to the function
  path: NodePath<t.Function>;
  // Parameter names
  params: string[];
  // Return type if known
  returnType?: InferredType;
  // Functions this function calls
  callees: Set<string>;
  // Functions that call this function
  callers: Set<string>;
}

// Call site information
export interface CallSite {
  // Name of the function being called
  callee: string;
  // Argument types at this call site
  argumentTypes: (InferredType | null)[];
  // NodePath to the call expression
  path: NodePath<t.CallExpression>;
}

// Configuration for type inference depth limits
export interface TypeInferenceConfig {
  // Maximum depth for call graph traversal
  maxDepth: number;
  // Maximum time in milliseconds for type inference
  maxTime?: number;
}
