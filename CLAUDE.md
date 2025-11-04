# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Test-Driven Development (TDD)

**ALWAYS USE TDD: WRITE TESTS FIRST, THEN IMPLEMENT**

When implementing new features or fixing bugs, you MUST follow Test-Driven Development practices. This is non-negotiable.

### TDD Workflow - ALWAYS Follow This Process

1. **Write Tests FIRST**:
   - Create a new test file (e.g., `src/__tests__/feature-name.test.ts`)
   - Write comprehensive test cases covering:
     - Happy path (expected usage)
     - Edge cases (boundary conditions, empty inputs, null values)
     - Error cases (invalid inputs, expected failures)
     - Integration scenarios (how components work together)
   - Identify and add any missing test cases from the examples in TODO.md
   - Run tests to verify they FAIL (as expected, since feature isn't implemented yet)

2. **Implement Code to Make Tests Pass**:
   - Write the minimal code needed to make the tests pass
   - Run tests frequently during implementation
   - Refactor as needed while keeping tests green

3. **Verify All Tests Pass**:
   - Run the full test suite: `npm test`
   - Ensure no existing tests were broken
   - Verify new tests are passing

4. **Update Documentation**:
   - Mark items as completed in TODO.md
   - Update CLAUDE.md if significant patterns or practices changed
   - Document any known limitations or complications discovered

### ⚠️ MANDATORY 5-Point Testing Strategy

**For EVERY feature implementation, you MUST create ALL five types of tests:**

1. ✅ **Minimal test case** - Test the construct in isolation
   - File: `src/__tests__/feature-name.test.ts`
   - Example: `const arr1 = [1, 2, 3]; const arr2 = [...arr1, 4, 5];`
   - Should verify basic functionality works correctly

2. ✅ **Realistic test case** - Test the construct in realistic context
   - File: Same feature test file
   - Example: Real-world scenarios section showing actual use cases
   - Should verify the feature works as users would actually use it

3. ✅ **Edge cases** - Test nested, combined, and boundary conditions
   - File: Same feature test file
   - Example: Spread of spread, empty arrays, mixed types, etc.
   - Should verify the feature handles unusual or complex scenarios

4. ✅ **TypeScript compilation** - Verify TypeScript output compiles without errors
   - File: `src/__tests__/typescript-compilation.test.ts`
   - Add a test case in the appropriate Phase section
   - Should verify generated TypeScript code is valid and compiles

5. ✅ **Confidence scores** - Verify confidence scores are reasonable (≥0.7 for good inferences)
   - File: `src/__tests__/confidence-scores.test.ts`
   - Add tests checking confidence scores for the new feature
   - Should verify type inference assigns appropriate confidence levels

**FAILURE TO FOLLOW THIS STRATEGY IS UNACCEPTABLE**

If you implement a feature without all 5 test types, you have NOT completed the task. Go back and add the missing tests before marking the feature as complete.

**Example - Spread Operator Implementation:**
1. ✅ Created `spread-operator.test.ts` with 29 tests (minimal + realistic + edge cases)
2. ✅ Added 6 tests to `typescript-compilation.test.ts` Phase 3 section
3. ✅ Added 5 tests to `confidence-scores.test.ts` Phase 3 section
4. ✅ All 561+ tests passing, no regressions
5. ✅ Feature marked complete in TODO.md

### Test Update Requirements

**For existing functionality**:
1. **Before making changes**: Run existing tests to ensure they pass
2. **After making changes**:
   - Update existing tests if behavior has changed
   - Add regression tests for bug fixes
   - Run tests to verify they pass: `npm test`
3. **Test coverage**: Aim for 70%+ coverage for new code

### What requires test updates:

- ✅ **New features** → Write tests FIRST using TDD (see workflow above)
- ✅ **Bug fixes** → Add regression tests showing the bug, then fix it
- ✅ **Refactoring** → Update tests to match new structure (if needed)
- ✅ **API changes** → Update integration tests
- ✅ **TypeScript generation changes** → Update unminifier.test.ts
- ✅ **Type inference changes** → Create feature-specific test file (e.g., template-literals.test.ts)
- ✅ **CLI changes** → Update index.test.ts

### TDD Examples from This Project

**Example 1 - Template Literals (Phase 1)**:
1. Created `src/__tests__/template-literals.test.ts` with 8 test cases
2. Ran tests - all failed as expected
3. Added TemplateLiteral case to TypeCollector's `inferTypeFromNode`
4. Added same to TypeResolver's `inferTypeFromNode`
5. Ran tests - all 8 passed ✅

**Example 2 - Logical Expressions (Phase 2)**:
1. Created `src/__tests__/logical-expressions.test.ts` with 30 test cases
2. Ran tests - 19 failed as expected
3. Added LogicalExpression support to TypeCollector and TypeResolver
4. Adjusted 4 tests with overly strict expectations
5. Ran tests - all 30 passed ✅

### Discovering Complications During TDD

When implementing features, you may discover complications (like the `slice()` method ambiguity). When this happens:

1. **Document the issue**: Add a detailed entry to TODO.md in the appropriate phase
2. **Include examples**: Provide comprehensive examples showing the problem
3. **Suggest solution approach**: Outline how the issue could be resolved
4. **Adjust tests**: Update test expectations to reflect current limitations
5. **Add comments**: Document the limitation in test comments

**Example - slice() method**: During Phase 1 implementation, we discovered that `slice()` exists on both strings and arrays with different return types. This was added to TODO.md as "Item #18: Context-Aware Method Inference" with comprehensive examples and solution approach.

### Test File Organization

- **Feature-specific tests**: `template-literals.test.ts`, `logical-expressions.test.ts`, etc.
- **Integration tests**: `unminifier.test.ts` (core functionality), `index.test.ts` (CLI)
- **Unit tests**: `known-types.test.ts`, `type-inferer.test.ts`
- Use descriptive `describe()` blocks to group related tests
- Use clear test names that explain what is being tested

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

  **Feature Tests** (427 tests):
  - **known-types.test.ts**: Tests for known types mapping (29 tests, 100% coverage)
  - **type-inferer.test.ts**: Core type inference tests (49 tests)
  - **unminifier.test.ts**: Unminification functionality (55 tests)
  - **index.test.ts**: CLI integration tests (22 tests)
  - **template-literals.test.ts**: Template literal inference (8 tests)
  - **unary-expressions.test.ts**: Unary expression inference (18 tests)
  - **conditional-expressions.test.ts**: Ternary operator inference (15 tests)
  - **logical-expressions.test.ts**: Logical expression inference (30 tests)
  - **regexp-literals.test.ts**: RegExp literal inference (28 tests)
  - **array-string-methods.test.ts**: Array/string method inference (35 tests)
  - **static-methods.test.ts**: Static method inference (33 tests)
  - **multi-pass-inference.test.ts**: Multi-pass type resolution (26 tests)
  - **union-types.test.ts**: Union type inference (22 tests)
  - **context-aware-methods.test.ts**: Context-aware method inference (31 tests)
  - **chained-methods.test.ts**: Chained method call inference (26 tests)

  **Validation Tests** (39 tests):
  - **typescript-compilation.test.ts**: Verify TypeScript output compiles (17 tests)
  - **confidence-scores.test.ts**: Verify confidence scores are reasonable (22 tests)

  **Total**: 466 tests across 17 test files

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

The test suite consists of **440 tests across 16 test files**, organized into two categories:

#### Feature Tests (401 tests)
Comprehensive tests for all implemented features, covering minimal cases, realistic scenarios, edge cases, and integration scenarios.

#### Validation Tests (39 tests)
Tests that verify quality metrics:

1. **typescript-compilation.test.ts** (17 tests)
   - Verifies that generated TypeScript code compiles without errors
   - Tests all Phase 1 and Phase 2 features
   - Tests complex scenarios and real-world code patterns
   - Run separately: `npm run test:compilation`

2. **confidence-scores.test.ts** (22 tests)
   - Validates that confidence scores meet quality thresholds (≥0.7 for good inferences)
   - Tests literal types (should be 1.0), method calls (≥0.9), union types (≥0.7)
   - Verifies type propagation maintains reasonable confidence
   - Run with other tests: `npm test confidence-scores.test.ts`

### Running Tests

```bash
# Run all feature tests (excludes compilation tests for speed)
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Run TypeScript compilation validation tests
npm run test:compilation

# Run specific test file
npm test -- <filename>.test.ts
```

### Testing Strategy (from TODO.md)

For each feature implementation:

1. ✅ **Create a minimal test case** showing the construct in isolation
2. ✅ **Create a realistic test case** showing the construct in context
3. ✅ **Test edge cases** (nested, combined with other features)
4. ✅ **Verify TypeScript output** compiles without errors (`typescript-compilation.test.ts`)
5. ✅ **Check confidence scores** are reasonable (≥0.7 for good inferences in `confidence-scores.test.ts`)

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
