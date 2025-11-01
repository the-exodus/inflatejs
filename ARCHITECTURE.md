# InflateJS Architecture

## Overview

InflateJS follows **SOLID principles** and uses a **modular, service-oriented architecture**. The application is designed for maintainability, testability, and extensibility.

## Architecture Principles

### SOLID Compliance

1. **Single Responsibility Principle (SRP)**: Each class has one reason to change
   - `CodeParser`: Only parses JavaScript
   - `CodeGenerator`: Only generates code
   - `CodeFormatter`: Only formats code
   - `TypeCollector`: Only collects type information
   - And so on...

2. **Open/Closed Principle (OCP)**: Open for extension, closed for modification
   - New transformers can be added without modifying existing code
   - Type inference strategies can be extended
   - Pipeline can be customized through dependency injection

3. **Liskov Substitution Principle (LSP)**: Implementations can be substituted
   - All services implement interfaces
   - Any ICodeParser implementation can replace CodeParser
   - Any ITypeInferenceEngine implementation can replace TypeInferenceEngine

4. **Interface Segregation Principle (ISP)**: Focused interfaces
   - Interfaces are small and focused on specific capabilities
   - Clients only depend on interfaces they need

5. **Dependency Inversion Principle (DIP)**: Depend on abstractions
   - High-level modules (Pipeline) depend on abstractions (interfaces)
   - Low-level modules (services) implement abstractions
   - Dependencies are injected, not created

## Directory Structure

```
src/
├── interfaces/          # Core abstractions and contracts
│   └── index.ts        # All interface definitions
├── services/           # Service implementations
│   ├── code-parser.ts
│   ├── code-generator.ts
│   ├── code-formatter.ts
│   ├── name-generator.ts
│   ├── scope-manager.ts
│   ├── ast-transformer.ts
│   ├── unminification-pipeline.ts
│   ├── type-inference/
│   │   ├── type-collector.ts
│   │   ├── usage-analyzer.ts
│   │   ├── call-graph-builder.ts
│   │   ├── type-resolver.ts
│   │   ├── type-inference-engine.ts
│   │   └── index.ts
│   └── index.ts
├── factories/          # Object creation and wiring
│   └── unminification-factory.ts
├── types.ts            # Type definitions
├── known-types.ts      # Known JavaScript type mappings
├── unminifier-facade.ts # Backward-compatible API
└── index.ts            # CLI entry point
```

## Core Components

### 1. Interfaces Layer (`interfaces/`)

Defines contracts for all major components:

- **ICodeParser**: Parse JavaScript into AST
- **ICodeGenerator**: Generate code from AST
- **ICodeFormatter**: Format code with Prettier
- **INameGenerator**: Generate meaningful variable names
- **IScopeManager**: Manage variable scopes and mappings
- **IASTTransformer**: Transform AST (rename, expand syntax)
- **ITypeInferenceEngine**: Coordinate type inference
- **ITypeCollector**: Collect type information from declarations
- **IUsageAnalyzer**: Analyze variable usage patterns
- **ICallGraphBuilder**: Build function call graph
- **ITypeResolver**: Resolve final types from all information

### 2. Service Layer (`services/`)

#### Basic Services

- **CodeParser**: Wraps `@babel/parser`
- **CodeGenerator**: Wraps `@babel/generator`
- **CodeFormatter**: Wraps Prettier with error handling
- **NameGenerator**: Generates meaningful names based on context
- **ScopeManager**: Tracks variable names across scopes
- **ASTTransformer**: Applies transformations (rename, expand syntax)

#### Type Inference Services (`services/type-inference/`)

**TypeInferenceEngine** coordinates a multi-phase process:

1. **TypeCollector**: Collects initial types from:
   - Variable declarations with initializers
   - Function declarations and parameters
   - Literal values
   - Array and object expressions

2. **CallGraphBuilder**: Builds relationships:
   - Maps all function definitions
   - Tracks caller-callee relationships
   - Records call sites with argument types

3. **UsageAnalyzer**: Analyzes how variables are used:
   - Binary operations (arithmetic, comparison)
   - Method calls (string methods, array methods)
   - Array access patterns
   - Comparisons with literals

4. **TypeResolver**: Resolves final types through:
   - Inter-procedural analysis
   - Call graph traversal (depth-limited to 8 levels)
   - Type propagation through function calls
   - Iterative convergence (up to 3 iterations)
   - Usage pattern resolution

### 3. Factory Layer (`factories/`)

**UnminificationFactory** implements:
- **Factory Pattern**: Creates and wires all dependencies
- **Dependency Injection**: Injects dependencies into components
- **Configuration**: Applies configuration to services

### 4. Facade Layer (`unminifier-facade.ts`)

**Unminifier Facade** provides:
- **Backward Compatibility**: Maintains original API
- **Simplified Interface**: One function for all operations
- **Default Configuration**: Sensible defaults

### 5. Pipeline (`services/unminification-pipeline.ts`)

**UnminificationPipeline** orchestrates the complete process:

```
Input Code
    ↓
1. Parse (CodeParser)
    ↓
2. Infer Types (TypeInferenceEngine) [optional]
    ↓
3. Transform AST (ASTTransformer)
    ↓
4. Add Type Annotations [if types inferred]
    ↓
5. Generate Code (CodeGenerator)
    ↓
6. Convert to TypeScript [if requested]
    ↓
7. Format (CodeFormatter)
    ↓
Output Code
```

## Type Inference Pipeline

### Phase 1: Collection
```
AST → TypeCollector → Initial TypeMap
```
- Literal types (string, number, boolean, null)
- Array types (homogeneous vs heterogeneous)
- Object types
- Function types
- Known constructor types (String, Number, Date, etc.)

### Phase 2: Call Graph
```
AST → CallGraphBuilder → {functions, callSites}
```
- Function definitions with parameters
- Caller-callee relationships
- Call sites with argument types

### Phase 3: Usage Analysis
```
AST + TypeMap → UsageAnalyzer → UsageMap
```
- Arithmetic operations → number
- String methods → string
- Array methods → array
- Comparisons with literals → inferred type

### Phase 4: Type Resolution (Iterative)
```
TypeMap + UsageMap + CallGraph → TypeResolver → Final TypeMap
```
- Parameter types from call sites
- Return types from function bodies
- Type propagation through call chains
- IIFE (Immediately Invoked Function Expression) handling
- Iterative convergence until stable

#### Depth Limiting & Safety
- **Max Depth**: 8 levels of call graph traversal
- **Max Time**: 5000ms timeout
- **Cycle Detection**: Visited set prevents infinite loops
- **Confidence Scoring**: High-confidence types not overridden

## Design Patterns Used

1. **Factory Pattern**: `UnminificationFactory` creates object graphs
2. **Strategy Pattern**: Different transformation strategies can be applied
3. **Facade Pattern**: `unminifier-facade.ts` simplifies the API
4. **Dependency Injection**: Services receive dependencies via constructor
5. **Single Responsibility**: Each class has one well-defined purpose
6. **Interface Segregation**: Small, focused interfaces

## Testing Strategy

- **Unit Tests**: Test individual services in isolation
- **Integration Tests**: Test complete pipeline
- **CLI Tests**: Test command-line interface
- **Test Coverage**:
  - known-types.ts: 100%
  - type-inference services: 85%+
  - unminifier: 72%+
  - Overall: ~67% statements

## Benefits of This Architecture

### Maintainability
- **Clear Separation**: Each component has a single, well-defined role
- **Easy to Understand**: Small classes with focused responsibilities
- **Self-Documenting**: Interfaces make contracts explicit

### Testability
- **Isolated Testing**: Services can be tested independently
- **Mock-Friendly**: Interfaces enable easy mocking
- **Focused Tests**: Small units mean focused test cases

### Extensibility
- **Add New Transformers**: Implement `IASTTransformer`
- **Custom Type Inference**: Implement `ITypeInferenceEngine` components
- **Different Formatters**: Implement `ICodeFormatter`
- **Plugin Architecture**: New services can be added without modifying existing code

### Flexibility
- **Configurable**: Factory allows different configurations
- **Swappable Components**: Implementations can be easily swapped
- **Backward Compatible**: Facade maintains old API

## Future Enhancements

Potential areas for extension:

1. **New Transformers**
   - Dead code elimination
   - Constant folding
   - Function inlining

2. **Enhanced Type Inference**
   - Generic type inference
   - Union and intersection types
   - Flow analysis for conditional types

3. **Additional Output Formats**
   - ESM modules
   - CommonJS
   - Different TypeScript configurations

4. **Performance Optimizations**
   - Parallel processing
   - Caching
   - Incremental updates

All can be added by creating new implementations without modifying existing code, thanks to the SOLID design.
