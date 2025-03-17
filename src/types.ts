import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

// Type inference result structure
export interface InferredType {
  // The inferred TypeScript type
  typeName: string;
  // Confidence level (0-1) of the inference
  confidence: number;
}

// Map to store inferred types for each variable/parameter
export type TypeMap = Map<string, InferredType>;

// Interface for the TypeInferer class
export interface ITypeInferer {
  inferTypes(ast: t.File): TypeMap;
}

// Function to infer type from a node based on its structure
export type InferTypeFromNode = (node: t.Node) => InferredType | null;

// Function to infer the return type of a function from its contents
export type InferFunctionReturnType = (path: NodePath<t.Function>) => void;
