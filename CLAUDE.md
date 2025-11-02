# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Test-Driven Development

**ALWAYS UPDATE TESTS WHEN CHANGING FUNCTIONALITY**

When modifying, adding, or fixing any functionality in this codebase, you MUST update or add corresponding tests. This is non-negotiable.

### Test Update Requirements

1. **Before making changes**: Run existing tests to ensure they pass
2. **After making changes**:
   - Update existing tests if behavior has changed
   - Add new tests for new functionality
   - Add regression tests for bug fixes
   - Run tests to verify they pass: `npm test`
3. **Test coverage**: Aim for 70%+ coverage for new code

### What requires test updates:

- ✅ **New features** → Add comprehensive tests
- ✅ **Bug fixes** → Add regression tests
- ✅ **Refactoring** → Update tests to match new structure
- ✅ **API changes** → Update integration tests
- ✅ **TypeScript generation changes** → Update unminifier.test.ts
- ✅ **Type inference changes** → Update type-inferer.test.ts
- ✅ **CLI changes** → Update index.test.ts

**Example**: If you modify TypeScript generation to add explicit `any` types, you must update tests in `unminifier.test.ts` to verify the new behavior.

## Project Overview

InflateJS is a TypeScript application that unminifies JavaScript code by restoring proper formatting, improving variable names, and inferring types. It uses Babel for AST parsing/generation and Prettier for code formatting.

### Architecture

The application follows **SOLID principles** with a modular, service-oriented architecture. See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

**Key architectural features:**
- **Dependency Injection**: Services receive dependencies via constructor
- **Interface-based Design**: All major components implement interfaces
- **Factory Pattern**: UnminificationFactory wires up dependencies
- **Facade Pattern**: Backward-compatible API through unminifier-facade
- **Single Responsibility**: Each class has one well-defined purpose

**Main components:**
- `interfaces/`: Core abstractions and contracts
- `services/`: Service implementations (parser, generator, transformer, type inference)
- `factories/`: Object creation and dependency wiring
- `unminifier-facade.ts`: Simplified, backward-compatible API
- `index.ts`: CLI entry point

## Development Commands

### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript in the `dist/` directory using `tsc`.

### Run during development
```bash
npx ts-node src/index.ts <input-file> [output-file] [options]
```

### Run built version
```bash
node dist/index.js <input-file> [output-file] [options]
```

### Command-line options
- `--no-rename`: Disable variable renaming, only format the code
- `--infer-types`: Enable type inference to add TypeScript type annotations
- `--typescript`: Output TypeScript code (.ts extension)

### Test
```bash
npm test
```
Runs all unit and integration tests using vitest.

```bash
npm run test:watch
```
Runs tests in watch mode for development.

```bash
npm run test:coverage
```
Runs tests with coverage report. Coverage results are displayed in the terminal and saved to the `coverage/` directory.

```bash
npm run test:ci
```
Runs tests in CI mode with coverage and limited workers (optimized for CI environments).

## Detailed Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for comprehensive architecture documentation.

### Core Processing Pipeline (UnminificationPipeline)

The unminification process follows a service-oriented approach:

1. **Parsing** (`CodeParser`): Converts minified JavaScript into an AST using `@babel/parser`
2. **Type Inference** (`TypeInferenceEngine`, optional): Multi-phase type inference
   - Collection: Gather types from declarations
   - Call Graph: Build function relationships
   - Usage Analysis: Track variable usage patterns
   - Resolution: Resolve final types through inter-procedural analysis
3. **AST Transformation** (`ASTTransformer`):
   - Rename identifiers using scope-aware mappings
   - Expand condensed syntax (arrow functions, shorthand properties)
4. **Type Annotation** (if enabled): Add JSDoc comments with inferred types
5. **Code Generation** (`CodeGenerator`): Generate code using `@babel/generator`
6. **TypeScript Conversion** (if requested): Convert JSDoc to TypeScript syntax
7. **Formatting** (`CodeFormatter`): Apply Prettier for consistent style

### Type Inference System (Modular Services)

The type inference system uses **four specialized services** coordinated by `TypeInferenceEngine`:

1. **TypeCollector**: Collects initial types from declarations
   - Literal types, array/object expressions, function types
   - Known constructor types (String, Number, Date, etc.)

2. **CallGraphBuilder**: Builds function call relationships
   - Maps all function definitions
   - Tracks caller-callee relationships
   - Records call sites with argument types

3. **UsageAnalyzer**: Analyzes variable usage patterns
   - Binary operations (`+`, `-`, `*`, `/`) → numeric types
   - Method calls (`charAt`, `split`, `map`, `filter`) → string/array types
   - Comparisons with literals → inferred types
   - Member access patterns

4. **TypeResolver**: Resolves final types through:
   - Inter-procedural analysis
   - Call graph traversal (depth-limited to 8 levels, 5s timeout)
   - Type propagation through function calls
   - Iterative convergence (up to 3 iterations)
   - Confidence-based type selection (0-1 score)

### Entry Point (src/index.ts)

Command-line interface that uses `UnminificationFactory` to create a configured pipeline and process files.

## Code Organization

### Service Layer
- **src/services/code-parser.ts**: Parse JavaScript to AST
- **src/services/code-generator.ts**: Generate code from AST
- **src/services/code-formatter.ts**: Format code with Prettier
- **src/services/name-generator.ts**: Generate meaningful variable names
- **src/services/scope-manager.ts**: Manage variable scopes and mappings
- **src/services/ast-transformer.ts**: Transform AST (rename, expand)
- **src/services/unminification-pipeline.ts**: Orchestrate the complete process
- **src/services/type-inference/**: Type inference subsystem
  - **type-collector.ts**: Collect types from declarations
  - **usage-analyzer.ts**: Analyze variable usage patterns
  - **call-graph-builder.ts**: Build function call graph
  - **type-resolver.ts**: Resolve final types
  - **type-inference-engine.ts**: Coordinate type inference

### Core Files
- **src/interfaces/index.ts**: All interface definitions (contracts)
- **src/factories/unminification-factory.ts**: Dependency injection and wiring
- **src/unminifier-facade.ts**: Backward-compatible API facade
- **src/index.ts**: CLI entry point
- **src/types.ts**: TypeScript type definitions
- **src/known-types.ts**: Standard JavaScript type mappings

### Tests
- **src/__tests__/**: Test files (vitest)
  - **known-types.test.ts**: Tests for known-types.ts (100% coverage)
  - **type-inferer.test.ts**: Tests for type inference system (49 tests)
  - **unminifier.test.ts**: Tests for unminification (48 tests)
  - **index.test.ts**: Integration tests for CLI (22 tests)

## Key Implementation Details

### Variable Renaming Strategy

Variables matching the pattern `/^[a-z]$|^[a-z][0-9]+$/` (single lowercase letters or letter+number combinations) are considered "minified" and renamed. The renaming uses a suggestion system based on parameter position:
- Parameters `a`, `b`, `c` → `param`, `value`, `item`
- Subsequent variables get numbered suffixes: `param2`, `value2`, etc.

### Scope Handling

The code uses Babel's scope system (`path.scope.getBinding()` and `scope.uid`) to ensure variable renames don't create conflicts. Each scope gets its own name mapping stored in `scopeNameMaps`.

### TypeScript Output Conversion

When outputting TypeScript, type annotations are first added as JSDoc comments during AST traversal, then converted to TypeScript syntax using regex-based transformations in `convertToTypeScript()`. Only types with confidence ≥ 0.7 are added.

## Testing

### Test Framework

The project uses **vitest** with TypeScript support (ts-vitest) for all testing. Tests are located in `src/__tests__/` and follow the naming convention `*.test.ts`.

### Test Structure

The test suite consists of 126 tests across 4 test files:

1. **known-types.test.ts** (28 tests)
   - Tests for the known types map
   - Validates basic JavaScript types, complex types, array methods, string methods, and object methods
   - Achieves 100% code coverage

2. **type-inferer.test.ts** (26 tests)
   - Tests for the type inference system
   - Covers literal type inference, array types, object types, function types, usage-based inference
   - Tests parameter type inference, known types integration, edge cases, and confidence scoring
   - Achieves 85% code coverage

3. **unminifier.test.ts** (50 tests)
   - Tests for the core unminifier functionality
   - Covers variable renaming, function transformations, object property transformations
   - Tests formatting, type inference integration, TypeScript output, complex transformations
   - Tests real-world scenarios, error handling, and option combinations
   - Achieves 72% code coverage

4. **index.test.ts** (22 tests)
   - Integration tests for the CLI
   - Tests command-line argument parsing, file I/O, error handling
   - Tests output validation, complex real-world scenarios, TypeScript output integration
   - Tests various option combinations

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Current Coverage

Overall coverage: ~67% statements, ~58% branches, ~77% functions

- **known-types.ts**: 100% coverage
- **type-inferer.ts**: 85% coverage
- **unminifier.ts**: 72% coverage
- **index.ts**: Integration tested via CLI tests

## Development Practices

### IMPORTANT: Always Write Tests for New Functionality

**When adding new features or modifying existing code, you MUST:**

1. **Create corresponding tests** in the appropriate test file:
   - New functions/classes → Create tests in the same test file or create a new test file
   - Bug fixes → Add regression tests to prevent the bug from reoccurring
   - New CLI options → Add tests to `index.test.ts`
   - New type inference logic → Add tests to `type-inferer.test.ts`

2. **Run tests before committing**:
   ```bash
   npm test
   ```

3. **Ensure tests pass** - Do not commit failing tests

4. **Aim for high coverage** - New code should have at least 70% test coverage

5. **Write meaningful tests** that cover:
   - Happy path (expected usage)
   - Edge cases (empty inputs, null values, boundary conditions)
   - Error cases (invalid inputs, expected failures)
   - Integration scenarios (how components work together)

### Test Writing Guidelines

- Use descriptive test names that explain what is being tested
- Group related tests using `describe` blocks
- Keep tests focused - one test should verify one behavior
- Use `beforeEach`/`afterEach` for setup/cleanup
- Mock external dependencies when appropriate
- Test both successful and error scenarios

### Example Test Structure

```typescript
describe('ModuleName', () => {
  describe('featureName', () => {
    it('should handle basic case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should throw error for invalid input', () => {
      // Test error handling
    });
  });
});
```

### IMPORTANT: Keep CLAUDE.md Updated

**When making significant changes to the codebase, update this CLAUDE.md file to reflect:**

1. **New features** - Document new functionality, APIs, or modules
2. **Architecture changes** - Update architecture descriptions if the design changes
3. **New commands** - Add new npm scripts or CLI commands
4. **Configuration changes** - Document new environment variables, config files, or build settings
5. **Testing changes** - Update test documentation when test structure changes
6. **Dependencies** - Note any significant new dependencies and their purpose
7. **Breaking changes** - Clearly document any breaking changes to the API or behavior

**Why this matters:**
- This file helps future Claude instances understand the project quickly
- It serves as living documentation that stays in sync with the code
- It prevents knowledge loss and reduces onboarding time
- It ensures consistent development practices across sessions

**When to update CLAUDE.md:**
- After adding new modules or significant features
- When changing the project architecture
- After adding new development commands or scripts
- When establishing new development patterns or conventions
- After making changes that future developers (human or AI) should know about

This file is not just documentation - it's a critical tool for maintaining code quality and project continuity.
