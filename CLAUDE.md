# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InflateJS is a TypeScript application that unminifies JavaScript code by restoring proper formatting, improving variable names, and inferring types. It uses Babel for AST parsing/generation and Prettier for code formatting.

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
Runs all unit and integration tests using Jest.

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

## Architecture

### Core Processing Pipeline (src/unminifier.ts)

The unminification process follows a multi-pass approach:

1. **Parsing**: Uses `@babel/parser` to convert minified JavaScript into an AST
2. **First Pass - Name Collection**: Traverses the AST to identify minified variables (single letters like `a`, `b`, `c` or patterns like `a1`, `b2`) and assigns them meaningful replacement names based on context. Variable renaming is **scope-aware** using Babel's scope tracking to avoid conflicts.
3. **Second Pass - Transformation**:
   - Renames all identifiers using collected mappings
   - Converts arrow functions and function expressions with implicit returns to block statements with explicit returns
   - Expands shorthand object properties
4. **Type Inference Pass** (if enabled): Uses `TypeInferer` class to analyze the AST and infer types for variables and function parameters
5. **Type Annotation** (for TypeScript output): Adds type annotations as JSDoc comments that are later converted to TypeScript syntax
6. **Code Generation**: Uses `@babel/generator` to produce formatted code from the transformed AST
7. **Final Formatting**: Applies Prettier for consistent code style

### Type Inference System (src/type-inferer.ts)

The `TypeInferer` class performs three-pass type analysis:

1. **Declaration Collection**: Identifies all variable declarations, function declarations, and parameters. Infers types from initial values (literals, array/object expressions, function expressions).
2. **Usage Analysis**: Tracks how variables are used throughout the code:
   - Binary operations (`+`, `-`, `*`, `/`, etc.) suggest numeric types
   - String/Array method calls (`charAt`, `split`, `map`, `filter`, etc.)
   - Comparisons with literals
   - Member access patterns
3. **Type Resolution**: Combines information from declarations and usage patterns to determine the most likely type with a confidence score (0-1).

The type inferer maintains:
- `typeMap`: Maps variable names to `InferredType` (type name + confidence)
- `usageMap`: Tracks all usage patterns for each variable
- `knownTypes`: Predefined return types for standard JavaScript constructors and methods (src/known-types.ts)

### Entry Point (src/index.ts)

Command-line argument parsing and file I/O. Calls `unminify()` with appropriate options and handles errors.

## Code Organization

- **src/index.ts**: CLI entry point with argument parsing
- **src/unminifier.ts**: Core unminification logic and AST transformations
- **src/type-inferer.ts**: Type inference engine
- **src/types.ts**: TypeScript type definitions for the type inference system
- **src/known-types.ts**: Map of standard JavaScript types and method return types
- **src/__tests__/**: Test files (Jest)
  - **known-types.test.ts**: Tests for known-types.ts (100% coverage)
  - **type-inferer.test.ts**: Tests for type inference system (85% coverage)
  - **unminifier.test.ts**: Tests for unminifier core logic (72% coverage)
  - **index.test.ts**: Integration tests for CLI

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

The project uses **Jest** with TypeScript support (ts-jest) for all testing. Tests are located in `src/__tests__/` and follow the naming convention `*.test.ts`.

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
